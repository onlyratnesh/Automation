
import { createClient } from "@/lib/supabase/server";
import { authorize, getCurrentUserId } from "@/lib/iam";
import { Queue } from "bullmq";

// Initialize Queue (Same as in src/lib/queue.ts but we need to import or recreate)
// Ideally we should export the queue instance or connection details from a shared lib
const pipelineQueue = new Queue("pipeline-execution", {
    connection: {
        url: process.env.REDIS_URL || "redis://localhost:6379",
    },
});

export type Pipeline = {
    id: string;
    name: string;
    definition: any;
    user_id: string;
    created_at: string;
    updated_at: string;
};

export class PipelineService {

    static async list() {
        // RBAC: Must be able to read pipelines
        // ABAC: Handled by RLS (Policies restrict to own pipelines)
        await authorize("pipelines.read");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = await (createClient as any)();
        const { data, error } = await supabase
            .from("pipelines")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data as Pipeline[];
    }

    static async getById(id: string) {
        await authorize("pipelines.read");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = await (createClient as any)();
        const { data, error } = await supabase
            .from("pipelines")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;
        return data as Pipeline;
    }

    static async create(name: string, definition: any) {
        await authorize("pipelines.create");
        const userId = await getCurrentUserId();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = await (createClient as any)();
        const { data, error } = await supabase
            .from("pipelines")
            .insert({
                name,
                definition,
                user_id: userId
            })
            .select()
            .single();

        if (error) throw error;
        return data as Pipeline;
    }

    static async update(id: string, updates: Partial<Pipeline>) {
        await authorize("pipelines.create"); // Using 'create' permission for edit/update logic typically

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = await (createClient as any)();
        const { data, error } = await supabase
            .from("pipelines")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        return data as Pipeline;
    }

    static async delete(id: string) {
        await authorize("pipelines.delete"); // If dedicated delete permission exists, or fallback to create/manage

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = await (createClient as any)();
        const { error } = await supabase
            .from("pipelines")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return true;
    }

    static async trigger(id: string) {
        await authorize("pipelines.create"); // Triggering creates a run
        const userId = await getCurrentUserId();

        // 1. Get Pipeline to ensure it exists and user has access (via RLS)
        const pipeline = await this.getById(id);

        // 2. Create Run Record
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = await (createClient as any)();
        const { data: run, error } = await supabase
            .from("pipeline_runs")
            .insert({
                pipeline_id: id,
                user_id: userId,
                status: "queued"
            })
            .select()
            .single();

        if (error) throw error;

        // 3. Add to Redis Queue
        await pipelineQueue.add("run", {
            runId: run.id,
            definition: pipeline.definition,
            userId: userId
        });

        return run;
    }

    static async getRuns(pipelineId?: string) {
        await authorize("pipelines.read");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = await (createClient as any)();
        let query = supabase
            .from("pipeline_runs")
            .select("*, pipelines(name)")
            .order("created_at", { ascending: false });

        if (pipelineId) {
            query = query.eq("pipeline_id", pipelineId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }
}

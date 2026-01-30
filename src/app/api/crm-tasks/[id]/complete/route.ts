import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/crm-tasks/[id]/complete - Complete task and log activity
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { notes, outcome, contacted_by, duration_minutes } = await req.json();

        // 1. Get the task
        const { data: task, error: taskError } = await supabaseAdmin
            .from("crm_tasks")
            .select("*")
            .eq("id", id)
            .single();

        if (taskError) throw taskError;

        // 2. Mark task as completed
        const { error: updateError } = await supabaseAdmin
            .from("crm_tasks")
            .update({
                status: "Completed",
                completed_at: new Date().toISOString(),
            })
            .eq("id", id);

        if (updateError) throw updateError;

        // 3. Create activity record
        const { data: activity, error: activityError } = await supabaseAdmin
            .from("lead_activities")
            .insert({
                lead_id: task.lead_id,
                deal_id: task.deal_id,
                task_id: id,
                type: "Note",
                notes: notes || `Completed task: ${task.title}`,
                outcome: outcome || "Positive",
                duration_minutes,
                contacted_by,
            })
            .select()
            .single();

        if (activityError) throw activityError;

        return NextResponse.json({
            success: true,
            task_id: id,
            activity_id: activity.id,
        });
    } catch (error: any) {
        console.error("[API POST /crm-tasks/[id]/complete] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

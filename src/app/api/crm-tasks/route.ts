import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type CrmTask = {
    id: string;
    lead_id?: string;
    deal_id?: string;
    title: string;
    notes?: string;
    assigned_to: string;
    due_date: string;
    reminder_at?: string;
    status: string;
    priority: string;
    created_at: string;
    completed_at?: string;
    // Joined data
    lead?: { name: string };
    deal?: { title: string; amount: number };
};

// GET /api/crm-tasks - List tasks (with filters)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const assigned_to = searchParams.get('assigned_to');
        const lead_id = searchParams.get('lead_id');
        const deal_id = searchParams.get('deal_id');
        const overdue = searchParams.get('overdue');

        let query = supabaseAdmin
            .from("crm_tasks")
            .select("*, lead:leads(name), deal:deals(title, amount)")
            .order("due_date", { ascending: true });

        if (status) {
            query = query.eq("status", status);
        }
        if (assigned_to) {
            query = query.eq("assigned_to", assigned_to);
        }
        if (lead_id) {
            query = query.eq("lead_id", lead_id);
        }
        if (deal_id) {
            query = query.eq("deal_id", deal_id);
        }
        if (overdue === 'true') {
            query = query.eq("status", "Pending").lt("due_date", new Date().toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[API GET /crm-tasks] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/crm-tasks - Create new task
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const { data, error } = await supabaseAdmin
            .from("crm_tasks")
            .insert(body)
            .select("*, lead:leads(name), deal:deals(title, amount)")
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error("[API POST /crm-tasks] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

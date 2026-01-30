import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type Activity = {
    id: string;
    lead_id: string;
    deal_id?: string;
    task_id?: string;
    type: string;
    notes?: string;
    outcome?: string;
    duration_minutes?: number;
    contacted_by: string;
    contacted_at: string;
    created_at: string;
};

// GET /api/activities - List all activities (with filters)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const lead_id = searchParams.get('lead_id');
        const deal_id = searchParams.get('deal_id');
        const type = searchParams.get('type');
        const limit = searchParams.get('limit');

        let query = supabaseAdmin
            .from("lead_activities")
            .select("*")
            .order("contacted_at", { ascending: false });

        if (lead_id) {
            query = query.eq("lead_id", lead_id);
        }
        if (deal_id) {
            query = query.eq("deal_id", deal_id);
        }
        if (type) {
            query = query.eq("type", type);
        }
        if (limit) {
            query = query.limit(parseInt(limit));
        }

        const { data, error } = await query;

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[API GET /activities] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/activities - Create new activity
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Ensure contacted_at is set
        if (!body.contacted_at) {
            body.contacted_at = new Date().toISOString();
        }

        const { data, error } = await supabaseAdmin
            .from("lead_activities")
            .insert(body)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error("[API POST /activities] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

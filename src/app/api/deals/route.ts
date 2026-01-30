import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type Deal = {
    id: string;
    lead_id: string;
    title: string;
    amount: number;
    system_size_kw?: number;
    stage: string;
    probability: number;
    expected_close_date?: string;
    actual_close_date?: string;
    actual_amount?: number;
    assigned_to?: string;
    lost_reason?: string;
    created_at: string;
    updated_at: string;
    // Joined data
    lead?: { name: string; phone?: string; email?: string };
};

// Stage probabilities
const STAGE_PROBABILITY: Record<string, number> = {
    'Site Visit': 20,
    'Quotation Sent': 40,
    'Negotiation': 60,
    'Awaiting Payment': 80,
    'Closed Won': 100,
    'Closed Lost': 0,
};

// GET /api/deals - List all deals (with optional filters)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const stage = searchParams.get('stage');
        const lead_id = searchParams.get('lead_id');

        let query = supabaseAdmin
            .from("deals")
            .select("*, lead:leads(name, phone, email)")
            .order("created_at", { ascending: false });

        if (stage) {
            query = query.eq("stage", stage);
        }
        if (lead_id) {
            query = query.eq("lead_id", lead_id);
        }

        const { data, error } = await query;

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[API GET /deals] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/deals - Create new deal
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Set probability based on stage
        const probability = STAGE_PROBABILITY[body.stage] || 20;

        const { data, error } = await supabaseAdmin
            .from("deals")
            .insert({
                ...body,
                probability,
            })
            .select("*, lead:leads(name, phone, email)")
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error("[API POST /deals] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

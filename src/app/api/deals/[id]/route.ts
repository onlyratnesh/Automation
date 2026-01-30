import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Stage probabilities
const STAGE_PROBABILITY: Record<string, number> = {
    'Site Visit': 20,
    'Quotation Sent': 40,
    'Negotiation': 60,
    'Awaiting Payment': 80,
    'Closed Won': 100,
    'Closed Lost': 0,
};

// GET /api/deals/[id] - Get single deal
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data, error } = await supabaseAdmin
            .from("deals")
            .select("*, lead:leads(name, phone, email)")
            .eq("id", id)
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[API GET /deals/[id]] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/deals/[id] - Update deal
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();

        // Update probability if stage changed
        if (body.stage && STAGE_PROBABILITY[body.stage] !== undefined) {
            body.probability = STAGE_PROBABILITY[body.stage];
        }

        // If closing as won, set actual close date
        if (body.stage === 'Closed Won' && !body.actual_close_date) {
            body.actual_close_date = new Date().toISOString().split('T')[0];
        }

        const { data, error } = await supabaseAdmin
            .from("deals")
            .update(body)
            .eq("id", id)
            .select("*, lead:leads(name, phone, email)")
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[API PUT /deals/[id]] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/deals/[id] - Delete deal
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { error } = await supabaseAdmin
            .from("deals")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[API DELETE /deals/[id]] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/deals/[id] - Update stage only (for drag-drop)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { stage } = await req.json();

        const probability = STAGE_PROBABILITY[stage] || 20;
        const updates: any = { stage, probability };

        // If closing as won, set actual close date
        if (stage === 'Closed Won') {
            updates.actual_close_date = new Date().toISOString().split('T')[0];
        }

        const { data, error } = await supabaseAdmin
            .from("deals")
            .update(updates)
            .eq("id", id)
            .select("*, lead:leads(name, phone, email)")
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[API PATCH /deals/[id]] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

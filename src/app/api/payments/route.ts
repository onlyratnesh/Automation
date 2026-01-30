import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type Payment = {
    id: string;
    deal_id: string;
    lead_id: string;
    amount: number;
    payment_type: string;
    payment_method?: string;
    reference_number?: string;
    notes?: string;
    received_by?: string;
    received_at: string;
    created_at: string;
    // Joined data
    deal?: { title: string; amount: number };
    lead?: { name: string };
};

// GET /api/payments - List payments (with filters)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const deal_id = searchParams.get('deal_id');
        const lead_id = searchParams.get('lead_id');

        let query = supabaseAdmin
            .from("payments")
            .select("*, deal:deals(title, amount), lead:leads(name)")
            .order("received_at", { ascending: false });

        if (deal_id) {
            query = query.eq("deal_id", deal_id);
        }
        if (lead_id) {
            query = query.eq("lead_id", lead_id);
        }

        const { data, error } = await query;

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[API GET /payments] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/payments - Record new payment
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Ensure received_at is set
        if (!body.received_at) {
            body.received_at = new Date().toISOString();
        }

        const { data, error } = await supabaseAdmin
            .from("payments")
            .insert(body)
            .select("*, deal:deals(title, amount), lead:leads(name)")
            .single();

        if (error) throw error;

        // Also log as activity
        await supabaseAdmin
            .from("lead_activities")
            .insert({
                lead_id: body.lead_id,
                deal_id: body.deal_id,
                type: "Payment Received",
                notes: `${body.payment_type} payment of ₹${body.amount.toLocaleString()} via ${body.payment_method || 'N/A'}`,
                outcome: "Positive",
                contacted_by: body.received_by,
            });

        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error("[API POST /payments] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

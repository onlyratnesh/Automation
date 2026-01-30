import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/iam";

// Admin client for bypassing RLS
const { createClient: createAdmin } = require('@supabase/supabase-js');
const supabaseAdmin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type Lead = {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    source?: string;
    status: string;
    assigned_to?: string;
    notes?: string;
    follow_up_date?: string;
    priority: string;
    last_contacted_at?: string;
    created_at: string;
    updated_at: string;
    user_id: string;
};

// GET - List all leads
export async function GET() {
    try {
        const userId = await getCurrentUserId();

        const { data, error } = await supabaseAdmin
            .from("leads")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create new lead
export async function POST(req: NextRequest) {
    try {
        const userId = await getCurrentUserId();
        const body = await req.json();

        const { data, error } = await supabaseAdmin
            .from("leads")
            .insert({
                ...body,
                user_id: userId
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/iam";

// Admin client for bypassing RLS
const { createClient: createAdmin } = require('@supabase/supabase-js');
const supabaseAdmin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get single lead
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getCurrentUserId();
        const { id } = await params;

        const { data, error } = await supabaseAdmin
            .from("leads")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;

        // Check ownership
        if (data.user_id !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update lead
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getCurrentUserId();
        const { id } = await params;
        const body = await req.json();

        // Verify ownership first
        const { data: existing } = await supabaseAdmin
            .from("leads")
            .select("user_id")
            .eq("id", id)
            .single();

        if (!existing || existing.user_id !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { data, error } = await supabaseAdmin
            .from("leads")
            .update({ ...body, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete lead
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getCurrentUserId();
        const { id } = await params;

        // Verify ownership first
        const { data: existing } = await supabaseAdmin
            .from("leads")
            .select("user_id")
            .eq("id", id)
            .single();

        if (!existing || existing.user_id !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { error } = await supabaseAdmin
            .from("leads")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

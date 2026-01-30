import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/crm-tasks/[id] - Get single task
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data, error } = await supabaseAdmin
            .from("crm_tasks")
            .select("*, lead:leads(name), deal:deals(title, amount)")
            .eq("id", id)
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[API GET /crm-tasks/[id]] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/crm-tasks/[id] - Update task
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();

        const { data, error } = await supabaseAdmin
            .from("crm_tasks")
            .update(body)
            .eq("id", id)
            .select("*, lead:leads(name), deal:deals(title, amount)")
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[API PUT /crm-tasks/[id]] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/crm-tasks/[id] - Delete task
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { error } = await supabaseAdmin
            .from("crm_tasks")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[API DELETE /crm-tasks/[id]] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


import { NextRequest, NextResponse } from "next/server";
import { PipelineService } from "@/services/pipelines";
import { IAMError } from "@/lib/iam";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(req: NextRequest, { params }: { params: any }) {
    try {
        const { id } = await params;
        const pipeline = await PipelineService.getById(id);
        return NextResponse.json(pipeline);
    } catch (error: any) {
        if (error instanceof IAMError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function PUT(req: NextRequest, { params }: { params: any }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const pipeline = await PipelineService.update(id, body);
        return NextResponse.json(pipeline);
    } catch (error: any) {
        if (error instanceof IAMError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(req: NextRequest, { params }: { params: any }) {
    try {
        const { id } = await params;
        await PipelineService.delete(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error instanceof IAMError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

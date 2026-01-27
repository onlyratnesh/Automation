
import { NextRequest, NextResponse } from "next/server";
import { PipelineService } from "@/services/pipelines";
import { IAMError } from "@/lib/iam";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(req: NextRequest, { params }: { params: any }) {
    try {
        const { id } = await params;
        const run = await PipelineService.trigger(id);
        return NextResponse.json(run, { status: 201 });
    } catch (error: any) {
        if (error instanceof IAMError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


import { NextRequest, NextResponse } from "next/server";
import { PipelineService } from "@/services/pipelines";
import { IAMError } from "@/lib/iam";

export async function GET() {
  try {
    const pipelines = await PipelineService.list();
    return NextResponse.json(pipelines);
  } catch (error: any) {
    if (error instanceof IAMError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, definition } = body;

    if (!name || !definition) {
      return NextResponse.json({ error: "Missing name or definition" }, { status: 400 });
    }

    const pipeline = await PipelineService.create(name, definition);
    return NextResponse.json(pipeline, { status: 201 });
  } catch (error: any) {
    if (error instanceof IAMError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

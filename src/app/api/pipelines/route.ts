import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Get all pipelines
export async function GET() {
  const pipelines = await prisma.pipeline.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(pipelines);
}

// Create or update a pipeline (upsert by id if provided)
export async function POST(request: Request) {
  const body = await request.json();

  const {
    id,
    name,
    definition,
  }: { id?: string; name: string; definition: unknown } = body;

  if (!name || !definition) {
    return NextResponse.json(
      { error: "name and definition are required" },
      { status: 400 },
    );
  }

  const pipeline = await prisma.pipeline.upsert({
    where: { id: id || "___non_existing___" },
    update: {
      name,
      definition,
    },
    create: {
      name,
      definition,
    },
  });

  return NextResponse.json(pipeline);
}



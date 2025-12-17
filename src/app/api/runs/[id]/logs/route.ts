import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface Params {
  params: {
    id: string;
  };
}

export async function GET(_: Request, { params }: Params) {
  const { id } = params;

  const run = await prisma.pipelineRun.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: { timestamp: "asc" },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}



import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exec } from "node:child_process";
import { promisify } from "node:util";

export const runtime = "nodejs";

const execAsync = promisify(exec);

type PipelineNode = {
  id: string;
  type: string;
  label: string;
  tasks?: { id: string; name: string; command: string }[];
};

type PipelineEdge = {
  id: string;
  source: string;
  target: string;
};

type StoredPipelineDefinition = {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
};

export async function POST(request: Request) {
  const body = await request.json();
  const { pipelineId }: { pipelineId?: string } = body;

  if (!pipelineId) {
    return NextResponse.json(
      { error: "pipelineId is required" },
      { status: 400 },
    );
  }

  const pipeline = await prisma.pipeline.findUnique({
    where: { id: pipelineId },
  });

  if (!pipeline) {
    return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
  }

  const definition = pipeline.definition as StoredPipelineDefinition;

  const run = await prisma.pipelineRun.create({
    data: {
      pipelineId: pipeline.id,
      status: "queued",
    },
  });

  // Fire-and-forget worker: this keeps things simple for now.
  // In real production you'd run this in a separate worker process.
  void runPipelineOnServer(run.id, definition);

  return NextResponse.json({ runId: run.id });
}

async function appendLog(runId: string, message: string) {
  await prisma.pipelineRunLog.create({
    data: {
      runId,
      message,
    },
  });
}

async function runPipelineOnServer(
  runId: string,
  definition: StoredPipelineDefinition,
) {
  await prisma.pipelineRun.update({
    where: { id: runId },
    data: { status: "running" },
  });

  await appendLog(runId, "🚀 Server: starting pipeline execution");

  try {
    // Very simple: run all stage nodes sequentially
    const stages = definition.nodes.filter((n) => n.type === "stage");

    for (const stage of stages) {
      await appendLog(runId, `📂 Stage: "${stage.label}"`);

      if (!stage.tasks || stage.tasks.length === 0) {
        await appendLog(runId, "  (no tasks in this stage, skipping)");
        continue;
      }

      for (const task of stage.tasks) {
        if (!task.command) {
          await appendLog(
            runId,
            `  ⚠️ Task "${task.name}" has no command, skipping`,
          );
          continue;
        }

        await appendLog(runId, `  🔨 Running: ${task.command}`);

        try {
          const { stdout, stderr } = await execAsync(task.command, {
            // IMPORTANT: in real life you should sandbox this
            shell: process.env.SHELL || "/bin/bash",
          });
          if (stdout) {
            await appendLog(runId, `    ✅ stdout:\n${stdout}`);
          }
          if (stderr) {
            await appendLog(runId, `    ⚠️ stderr:\n${stderr}`);
          }
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : JSON.stringify(err);
          await appendLog(
            runId,
            `    ❌ Command failed for task "${task.name}": ${message}`,
          );
        }
      }
    }

    await prisma.pipelineRun.update({
      where: { id: runId },
      data: { status: "completed" },
    });
    await appendLog(runId, "🏁 Server: pipeline finished");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    await prisma.pipelineRun.update({
      where: { id: runId },
      data: { status: "failed" },
    });
    await appendLog(runId, `🔥 Server: pipeline failed: ${message}`);
  }
}



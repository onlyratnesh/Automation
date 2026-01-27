import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { pipelineQueue } from '@/lib/queue';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json();
  const { pipelineId }: { pipelineId?: string } = body;

  if (!pipelineId) {
    return NextResponse.json(
      { error: 'pipelineId is required' },
      { status: 400 }
    );
  }

  // Fetch pipeline from database
  const { data: pipeline, error: pipelineError } = await supabase
    .from('pipelines')
    .select('*')
    .eq('id', pipelineId)
    .single();

  if (pipelineError || !pipeline) {
    return NextResponse.json(
      { error: 'Pipeline not found' },
      { status: 404 }
    );
  }

  // Create a new pipeline run
  const { data: run, error: runError } = await supabase
    .from('pipeline_runs')
    .insert({
      pipeline_id: pipeline.id,
      status: 'queued',
    })
    .select()
    .single();

  if (runError || !run) {
    return NextResponse.json(
      { error: 'Failed to create pipeline run' },
      { status: 500 }
    );
  }

  // Add job to queue
  try {
    await pipelineQueue.add('execute-pipeline', {
      runId: run.id,
      pipelineId: pipeline.id,
      definition: pipeline.definition,
    });

    return NextResponse.json({ runId: run.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to queue job: ${message}` },
      { status: 500 }
    );
  }
}

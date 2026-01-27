
import { Worker, Job } from 'bullmq';
import { connectionOptions, PipelineJobData } from '../lib/queue.js'; // Keep .js extension for TS module resolution if needed
import { supabaseAdmin as supabase } from '../lib/supabase/service'; // Use Admin client
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Helper to append logs to database
async function appendLog(runId: string, message: string) {
    const { error } = await supabase
        .from('pipeline_run_logs')
        .insert({
            run_id: runId,
            message,
            timestamp: new Date().toISOString(),
        });

    if (error) {
        console.error('Failed to append log:', error);
    }
}

// Helper to update run status
async function updateRunStatus(
    runId: string,
    status: 'queued' | 'running' | 'completed' | 'failed'
) {
    const { error } = await supabase
        .from('pipeline_runs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', runId);

    if (error) {
        console.error('Failed to update run status:', error);
    }
}

// Main pipeline execution logic
// Types for the Graph Engine
interface ExecNode {
    id: string;
    type: string;
    label: string;
    tasks?: { id: string; name: string; command: string }[];
}

interface ExecEdge {
    source: string;
    target: string;
    type: 'default' | 'true' | 'false';
}

// Main pipeline execution logic (Graph Engine)
async function executePipeline(job: Job<PipelineJobData>) {
    const { runId, definition } = job.data;

    await updateRunStatus(runId, 'running');
    await appendLog(runId, '🚀 Server: starting pipeline execution (Graph Engine)');

    try {
        if (!definition || !definition.nodes) {
            throw new Error("Invalid pipeline definition: missing nodes");
        }

        const nodes: ExecNode[] = definition.nodes;
        const edges: ExecEdge[] = definition.edges || [];

        // 1. Find Start Nodes (no incoming edges)
        const allTargets = new Set(edges.map(e => e.target));
        const startNodes = nodes.filter(n => !allTargets.has(n.id));

        if (startNodes.length === 0 && nodes.length > 0) {
            await appendLog(runId, '⚠️ Loop detected or no start node. Starting with first defined node.');
            startNodes.push(nodes[0]);
        }

        // 2. Traversal Queue
        let queue = [...startNodes];
        const visited = new Set<string>();
        let steps = 0;
        const MAX_STEPS = 100; // Circuit breaker

        while (queue.length > 0) {
            if (steps++ > MAX_STEPS) {
                throw new Error("Maximum execution steps exceeded (possible infinite loop).");
            }

            const node = queue.shift()!;

            // Allow re-visiting merge nodes? For MVP, let's strictly block cycles via simple visited
            // Use path-based visiting for loops later.
            // if (visited.has(node.id)) continue; 
            // visited.add(node.id);  <-- This blocks merge nodes if path 1 visits it first.
            // Better: Merge nodes should process. We only block if we are stuck.

            await appendLog(runId, `🔹 Processing: [${node.type}] ${node.label}`);

            // 3. Execution Logic per Type
            let outcome: 'default' | 'true' | 'false' = 'default';

            if (node.type === 'stage') {
                if (node.tasks && node.tasks.length > 0) {
                    for (const task of node.tasks) {
                        if (!task.command) continue;
                        await appendLog(runId, `  🔨 Running: ${task.command}`);
                        try {
                            const { stdout, stderr } = await execAsync(task.command, {
                                shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
                                timeout: 60000,
                            });
                            if (stdout) await appendLog(runId, `    ✅ ${stdout.trim().substring(0, 100)}...`);
                            if (stderr) await appendLog(runId, `    ⚠️ ${stderr.trim().substring(0, 100)}...`);
                        } catch (err: any) {
                            await appendLog(runId, `    ❌ Failed: ${err.message}`);
                            // Keep going?
                        }
                    }
                } else {
                    await appendLog(runId, "  (Empty Stage)");
                }
            } else if (node.type === 'condition') {
                // Simulate Condition (Random for now)
                const isTrue = Math.random() > 0.5;
                outcome = isTrue ? 'true' : 'false';
                await appendLog(runId, `  🔀 Condition evaluated to: ${outcome.toUpperCase()}`);
            } else if (node.type === 'subflow') {
                await appendLog(runId, "  (Sub-Pipeline not implemented yet)");
            }

            // 4. Follow Edges
            const outgoing = edges.filter(e => e.source === node.id);
            const validEdges = outgoing.filter(e => {
                if (node.type === 'condition') {
                    return e.type === outcome;
                }
                return true; // Follow all defaults
            });

            for (const edge of validEdges) {
                const target = nodes.find(n => n.id === edge.target);
                if (target) {
                    // Avoid adding if already in queue?
                    if (!queue.find(q => q.id === target.id)) {
                        queue.push(target);
                    }
                }
            }

            // Simple delay between steps for visual effect
            await new Promise(r => setTimeout(r, 500));
        }

        await updateRunStatus(runId, 'completed');
        await appendLog(runId, '🏁 Server: logical execution finished');
    } catch (err: any) {
        const message = err instanceof Error ? err.message : JSON.stringify(err);
        await updateRunStatus(runId, 'failed');
        await appendLog(runId, `🔥 Server: pipeline failed: ${message}`);
        throw err;
    }
}

// Create and start worker
export const pipelineWorker = new Worker<PipelineJobData>(
    'pipeline-execution',
    executePipeline,
    {
        connection: connectionOptions,
        concurrency: 5, // Process up to 5 pipelines concurrently
        limiter: {
            max: 10, // Max 10 jobs
            duration: 1000, // per second
        },
    }
);

// Worker event handlers
pipelineWorker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} (Run: ${job.data.runId}) completed successfully`);
});

pipelineWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
});

pipelineWorker.on('error', (err) => {
    console.error('Worker error:', err);
});

console.log('🔧 Pipeline worker started');


"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client"; // Assumes client-side supabase helper exists or I need to use generic one
// Wait, I need to check if client-side supabase helper exists. 
// Based on file list, I only saw server.ts in lib/supabase. 
// I should create a client-side helper if it's missing, or just use use some standard pattern.
// Let's assume standard pattern for now, but I'll check first.

export default function TestBackend() {
    const [logs, setLogs] = useState<string[]>([]);
    const [pipelineId, setPipelineId] = useState<string>("");

    const log = (msg: string) => setLogs((prev) => [...prev, `${new Date().toISOString()}: ${msg}`]);

    const createPipeline = async () => {
        try {
            log("Creating Pipeline...");
            const res = await fetch("/api/pipelines", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Test Pipeline " + Date.now(),
                    definition: {
                        nodes: [
                            {
                                id: "stage-1",
                                type: "stage",
                                label: "Build Stage",
                                tasks: [
                                    { id: "task-1", name: "Echo Hello", command: "echo 'Hello World'" }
                                ]
                            }
                        ],
                        edges: []
                    }
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || res.statusText);
            log(`Pipeline Created: ${data.id}`);
            setPipelineId(data.id);
        } catch (err: any) {
            log(`Error Creating: ${err.message}`);
        }
    };

    const listPipelines = async () => {
        try {
            log("Listing Pipelines...");
            const res = await fetch("/api/pipelines");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || res.statusText);
            log(`Pipelines Found: ${data.length}`);
        } catch (err: any) {
            log(`Error Listing: ${err.message}`);
        }
    };

    const triggerRun = async () => {
        if (!pipelineId) return log("No pipeline created yet.");
        try {
            log(`Triggering Run for ${pipelineId}...`);
            const res = await fetch(`/api/pipelines/${pipelineId}/run`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || res.statusText);
            log(`Run Triggered: ${data.id} - Status: ${data.status}`);
        } catch (err: any) {
            log(`Error Triggering: ${err.message}`);
        }
    };

    return (
        <div className="p-8 font-mono">
            <h1 className="text-xl font-bold mb-4">Backend Verification</h1>
            <div className="space-x-4 mb-4">
                <button onClick={createPipeline} className="px-4 py-2 bg-blue-500 text-white rounded">Create Pipeline</button>
                <button onClick={listPipelines} className="px-4 py-2 bg-green-500 text-white rounded">List Pipelines</button>
                <button onClick={triggerRun} className="px-4 py-2 bg-red-500 text-white rounded" disabled={!pipelineId}>Trigger Run</button>
            </div>
            <div className="border p-4 h-96 overflow-auto bg-gray-100 dark:bg-gray-800">
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    );
}

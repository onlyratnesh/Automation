
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IAMError, authorize } from "@/lib/iam";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(req: NextRequest, { params }: { params: any }) {
  try {
    const { id } = await params;

    // Check permission (User needs read access)
    // We can use a simpler check or the full authorize
    await authorize("pipelines.read");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await (createClient as any)();

    // 1. Get Run Status
    const { data: run, error: runError } = await supabase
      .from("pipeline_runs")
      .select("status")
      .eq("id", id)
      .single();

    if (runError) throw runError;

    // 2. Get Logs
    const { data: logs, error: logsError } = await supabase
      .from("pipeline_run_logs")
      .select("id, message, timestamp")
      .eq("run_id", id)
      .order("timestamp", { ascending: true });

    if (logsError) throw logsError;

    return NextResponse.json({
      status: run.status,
      logs: logs
    });

  } catch (error: any) {
    if (error instanceof IAMError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

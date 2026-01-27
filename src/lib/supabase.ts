import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types for type safety
export type Pipeline = {
  id: string;
  name: string;
  definition: any;
  created_at: string;
  updated_at: string;
};

export type PipelineRun = {
  id: string;
  pipeline_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
};

export type PipelineRunLog = {
  id: string;
  run_id: string;
  timestamp: string;
  message: string;
};

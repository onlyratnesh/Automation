# Backend Setup Instructions

## Prerequisites

1. **Supabase Database** (Already configured ✅)
   - Your Supabase project is set up at: `https://ivyezsgsbdnqegwhbnsh.supabase.co`
   - Credentials are in `.env` file

2. **Redis Server** (Required for job queue)
   - **Option A: Local Redis (Recommended for development)**
     ```bash
     # Windows (using Chocolatey)
     choco install redis-64
     redis-server
     
     # Or use Docker
     docker run -d -p 6379:6379 redis:alpine
     ```
   
   - **Option B: Upstash Redis (Free cloud Redis)**
     1. Go to https://upstash.com/
     2. Create a free Redis database
     3. Update `.env` with the connection string:
        ```
        REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
        ```

## Database Setup

### Step 1: Create Tables in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/ivyezsgsbdnqegwhbnsh
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the contents of `supabase-schema.sql`
5. Click "Run" to execute the SQL

This will create:
- `pipelines` table
- `pipeline_runs` table
- `pipeline_run_logs` table
- Necessary indexes and RLS policies

### Step 2: Verify Tables

Run this query in the SQL Editor to verify:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see: `pipelines`, `pipeline_runs`, `pipeline_run_logs`

## Running the Application

### Terminal 1: Start Next.js Dev Server
```bash
npm run dev
```

### Terminal 2: Start Worker Process
```bash
npm run worker
```

The worker will:
- Connect to Redis queue
- Listen for pipeline execution jobs
- Execute commands and log results to Supabase

## Testing the Backend

1. Open http://localhost:3001 in your browser
2. Create a simple pipeline with a few stages
3. Add tasks with safe commands like:
   - `echo "Hello from pipeline"`
   - `node --version`
   - `npm --version`
4. Click "Save" → should save to Supabase
5. Click "Run on Server" → should queue the job
6. Watch the execution console for real-time logs

## Troubleshooting

### Redis Connection Error
- Make sure Redis is running: `redis-cli ping` (should return "PONG")
- Check REDIS_URL in `.env`

### Supabase Connection Error
- Verify credentials in `.env`
- Check Supabase project status in dashboard

### Worker Not Processing Jobs
- Make sure worker is running in separate terminal
- Check worker console for errors
- Verify Redis connection

## Production Deployment

For production, you'll need:
1. Hosted Redis (Upstash, Redis Cloud, or AWS ElastiCache)
2. Worker running as a separate process/container
3. Environment variables configured in your hosting platform

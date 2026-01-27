import { Queue } from 'bullmq';

// Job types
export type PipelineJobData = {
    runId: string;
    pipelineId?: string; // Optional if not strictly needed by worker
    userId?: string;     // Context for who triggered it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition: any;     // Flexible JSON definition
};

// Redis connection options
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
// Parse URL for IORedis/BullMQ if needed, or pass URL directly if supported (BullMQ supports connection object)
// For simplicity in this project, we'll try to support both URL and host/port legacy
let connectionConfig;

if (process.env.REDIS_URL) {
    connectionConfig = { url: process.env.REDIS_URL };
} else {
    connectionConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    };
}

export const connectionOptions = {
    ...connectionConfig,
    maxRetriesPerRequest: null,
};

// Create pipeline execution queue
export const pipelineQueue = new Queue<PipelineJobData>('pipeline-execution', {
    connection: connectionOptions,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
            count: 50, // Keep last 50 failed jobs
        },
    },
});

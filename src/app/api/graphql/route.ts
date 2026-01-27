
import { createSchema, createYoga } from 'graphql-yoga'
import { PipelineService } from '@/services/pipelines';

const typeDefs = `
  scalar JSON
  
  type Pipeline {
    id: ID!
    name: String!
    definition: JSON!
    user_id: ID!
    created_at: String!
    updated_at: String!
  }

  type PipelineRun {
    id: ID!
    pipeline_id: ID!
    status: String!
    created_at: String!
  }

  type Query {
    pipelines: [Pipeline!]!
    pipeline(id: ID!): Pipeline
    pipelineRuns(pipelineId: ID): [PipelineRun!]!
  }

  type Mutation {
    createPipeline(name: String!, definition: JSON!): Pipeline!
    triggerPipeline(id: ID!): PipelineRun!
    deletePipeline(id: ID!): Boolean!
  }
`

const resolvers = {
    Query: {
        pipelines: () => PipelineService.list(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pipeline: (_: any, { id }: any) => PipelineService.getById(id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pipelineRuns: (_: any, { pipelineId }: any) => PipelineService.getRuns(pipelineId),
    },
    Mutation: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createPipeline: (_: any, { name, definition }: any) => PipelineService.create(name, definition),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        triggerPipeline: (_: any, { id }: any) => PipelineService.trigger(id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deletePipeline: (_: any, { id }: any) => PipelineService.delete(id),
    },
}

const schema = createSchema({
    typeDefs,
    resolvers,
})

const { handleRequest } = createYoga({
    schema,
    graphqlEndpoint: '/api/graphql',
    fetchAPI: { Response },
})

export { handleRequest as GET, handleRequest as POST, handleRequest as OPTIONS }

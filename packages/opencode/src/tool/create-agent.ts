import * as Tool from "./tool"
import { ToolJsonSchema } from "./json-schema"
import { AgentManager } from "@/agent/manager"
import { Agent } from "@/agent/agent"
import { Session } from "@/session/session"
import { Effect, Schema } from "effect"

const id = "create_agent"

const Parameters = Schema.Struct({
  name: Schema.String.annotate({ description: "A unique identifier for the new agent" }),
  description: Schema.String.annotate({ description: "A short description of the agent's purpose" }),
  system_prompt: Schema.String.annotate({ description: "The system prompt that defines the agent's behavior" }),
  model: Schema.optional(Schema.String.annotate({ description: "Optional model override" })),
})

export const CreateAgentTool = Tool.define(
  id,
  Effect.gen(function* () {
    const agents = yield* Agent.Service

    const execute = (
      params: Schema.Schema.Type<typeof Parameters>,
      ctx: Tool.Context,
    ): Effect.Effect<Tool.ExecuteResult<Record<string, unknown>>> =>
      Effect.gen(function* () {
        const existing = yield* agents.get(params.name)
        if (existing) {
          return { title: "create_agent", metadata: {} as Record<string, unknown>, output: `Agent "${params.name}" already exists.` }
        }

        const sessions = yield* Session.Service

        const info = yield* sessions.create({ agent: params.name, title: params.description })
        AgentManager.register({ id: params.name, name: params.name, sessionID: info.id })

        return { title: "create_agent", metadata: {} as Record<string, unknown>, output: `Agent "${params.name}" created successfully.` }
      }).pipe(Effect.orDie) as Effect.Effect<Tool.ExecuteResult<Record<string, unknown>>>

    return {
      description: "Create a new dynamic agent for task delegation",
      parameters: Parameters,
      jsonSchema: ToolJsonSchema.fromSchema(Parameters),
      execute,
    }
  }),
)

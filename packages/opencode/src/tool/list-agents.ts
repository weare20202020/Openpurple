import * as Tool from "./tool"
import { ToolJsonSchema } from "./json-schema"
import DESCRIPTION from "./list-agents.txt"
import { AgentManager } from "@/agent/manager"
import { Agent } from "@/agent/agent"
import { Effect, Schema } from "effect"

const id = "list_agents"

const Parameters = Schema.Struct({})

export const ListAgentsTool = Tool.define(
  id,
  Effect.gen(function* () {
    const agents = yield* Agent.Service

    const execute = (
      _params: Schema.Schema.Type<typeof Parameters>,
      ctx: Tool.Context,
    ): Effect.Effect<Tool.ExecuteResult<Record<string, unknown>>> =>
      Effect.gen(function* () {
        const list = yield* agents.list()
        const visible = list.filter((item) => item.hidden !== true)
        const lines = visible.map((item) => {
          const status = AgentManager.get(item.name)?.status ?? "unknown"
          const self = item.name === ctx.agent ? " (you)" : ""
          const description = item.description ?? "No description."
          return `- ${item.name}${self}: ${description} [status: ${status}]`
        })
        return {
          title: "list_agents",
          metadata: {} as Record<string, unknown>,
          output:
            lines.length > 0
              ? ["Agents currently on the team:", ...lines].join("\n")
              : "No agents are currently registered.",
        }
      }).pipe(Effect.orDie) as Effect.Effect<Tool.ExecuteResult<Record<string, unknown>>>

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      jsonSchema: ToolJsonSchema.fromSchema(Parameters),
      execute,
    }
  }),
)

import * as Tool from "./tool"
import { ToolJsonSchema } from "./json-schema"
import { AgentManager } from "@/agent/manager"
import { Agent } from "@/agent/agent"
import { Provider } from "@/provider/provider"
import { Session } from "@/session/session"
import { Global } from "@opencode-ai/core/global"
import { Effect, Exit, Schema } from "effect"
import fs from "fs/promises"
import path from "path"

const id = "create_agent"

const Parameters = Schema.Struct({
  name: Schema.String.annotate({ description: "A unique identifier for the new agent" }),
  description: Schema.String.annotate({ description: "A short description of the agent's purpose" }),
  system_prompt: Schema.String.annotate({ description: "The system prompt that defines the agent's behavior" }),
  model: Schema.optional(Schema.String.annotate({ description: "Optional model override" })),
})

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/

export const CreateAgentTool = Tool.define(
  id,
  Effect.gen(function* () {
    const agents = yield* Agent.Service

    const execute = (
      params: Schema.Schema.Type<typeof Parameters>,
      ctx: Tool.Context,
    ): Effect.Effect<Tool.ExecuteResult<Record<string, unknown>>> =>
      Effect.gen(function* () {
        const result = (output: string) => ({ title: "create_agent", metadata: {} as Record<string, unknown>, output })

        if (!NAME_PATTERN.test(params.name)) {
          return result(
            `Agent name "${params.name}" is invalid. Use letters, digits, "-" or "_", starting with a letter or digit.`,
          )
        }

        const existing = yield* agents.get(params.name)
        if (existing) {
          return result(`Agent "${params.name}" already exists.`)
        }

        let model: ReturnType<typeof Provider.parseModel> | undefined
        if (params.model) {
          if (!params.model.includes("/")) {
            return result(`Model "${params.model}" is invalid. Use the "provider/model" format, e.g. "deepseek/deepseek-flash".`)
          }
          model = Provider.parseModel(params.model)
        }

        yield* agents.register({
          name: params.name,
          description: params.description,
          prompt: params.system_prompt,
          appendDefaultPrompt: true,
          model,
        })
        const verified = yield* agents.get(params.name)
        if (!verified) {
          return result(`Agent "${params.name}" could not be registered.`)
        }

        const frontmatter = [
          "---",
          `description: ${JSON.stringify(params.description)}`,
          "mode: all",
          ...(params.model ? [`model: ${JSON.stringify(params.model)}`] : []),
          "appendDefaultPrompt: true",
          "---",
          "",
          params.system_prompt.trim(),
          "",
        ].join("\n")
        const dir = path.join(Global.Path.config, "agent")
        const file = path.join(dir, `${params.name}.md`)
        const persistExit = yield* Effect.promise(async () => {
          await fs.mkdir(dir, { recursive: true })
          await fs.writeFile(file, frontmatter, "utf8")
        }).pipe(Effect.exit)
        const persisted = Exit.isSuccess(persistExit)

        const sessions = yield* Session.Service
        const info = yield* sessions.create({ agent: params.name, title: params.description })
        AgentManager.register({ id: params.name, name: params.name, sessionID: info.id })

        return result(
          `Agent "${params.name}" created successfully (session ${info.id}).` +
            (persisted ? "" : ` Warning: the definition could not be saved to ${file}, so it will not survive a restart.`),
        )
      }).pipe(Effect.orDie) as Effect.Effect<Tool.ExecuteResult<Record<string, unknown>>>

    return {
      description: "Create a new dynamic agent for task delegation",
      parameters: Parameters,
      jsonSchema: ToolJsonSchema.fromSchema(Parameters),
      execute,
    }
  }),
)

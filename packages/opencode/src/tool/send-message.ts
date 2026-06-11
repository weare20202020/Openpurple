import * as Tool from "./tool"
import { ToolJsonSchema } from "./json-schema"
import { AgentManager } from "@/agent/manager"
import { Agent } from "@/agent/agent"
import { Session } from "@/session/session"
import { Service as SessionPromptService } from "@/session/prompt"
import { Effect, Schema } from "effect"
import type { InboxMessage } from "@/agent/types"
import type { Interface as SessionPromptInterface } from "@/session/prompt"
import * as Log from "@opencode-ai/core/util/log"

const a2aLog = Log.create({ service: "a2a" })

const id = "send_message"

const Parameters = Schema.Struct({
  to: Schema.String.annotate({ description: "The target agent name to send the message to" }),
  message: Schema.String.annotate({ description: "The message content to send" }),
  type: Schema.optional(Schema.Literals(["task", "question", "summary"])).annotate({
    description: "Type of message (default: task)",
  }),
})

const drainInbox = (
  agentId: string,
  promptService: SessionPromptInterface,
  sessions: Session.Interface,
) =>
  Effect.gen(function* () {
    while (true) {
      const msgs = AgentManager.drainMessages(agentId)
      a2aLog.info("drainInbox", { agentId, count: msgs.length })
      if (msgs.length === 0) {
        AgentManager.setStatus(agentId, "idle")
        a2aLog.info("drainInbox idle", { agentId })
        return
      }
      AgentManager.setStatus(agentId, "busy")
      const entry = AgentManager.get(agentId)
      if (!entry?.sessionID) {
        a2aLog.info("drainInbox no session", { agentId })
        return
      }
      const parts = (msgs as InboxMessage[]).map(msg => ({
        type: "text" as const,
        text: `A2A [From ${msg.from} (${msg.type})]: ${msg.content}`,
      }))
      a2aLog.info("drainInbox calling prompt", { agentId, partsCount: parts.length })
      const result = yield* promptService.prompt({
        sessionID: entry.sessionID as any,
        agent: agentId,
        parts,
      }).pipe(Effect.orDie)
      a2aLog.info("drainInbox prompt returned", { agentId })
    }
  })

export const SendMessageTool = Tool.define(
  id,
  Effect.gen(function* () {
    const agents = yield* Agent.Service

    const execute = (
      params: Schema.Schema.Type<typeof Parameters>,
      ctx: Tool.Context,
    ): Effect.Effect<Tool.ExecuteResult<Record<string, unknown>>> =>
      Effect.gen(function* () {
        const promptService = yield* SessionPromptService
        const sessions = yield* Session.Service

        let target = AgentManager.get(params.to)
        if (!target || !target.sessionID) {
          const allSessions = yield* sessions.listGlobal({ roots: true })
          const latest = allSessions
            .filter((s) => s.agent === params.to)
            .toSorted((a, b) => b.time.updated - a.time.updated)[0]
          if (latest) {
            AgentManager.register({ id: params.to, name: params.to, sessionID: latest.id })
          } else {
            const info = yield* sessions.create({ agent: params.to })
            AgentManager.register({ id: params.to, name: params.to, sessionID: info.id })
          }
          target = AgentManager.get(params.to)!
        }

        const caller = AgentManager.get(ctx.agent)
        if (!caller) {
          AgentManager.register({ id: ctx.agent, name: ctx.agent, sessionID: ctx.sessionID })
        } else if (!caller.sessionID) {
          AgentManager.register({ id: ctx.agent, name: ctx.agent, sessionID: ctx.sessionID })
        }

        AgentManager.pushInbox(params.to, {
          from: ctx.agent,
          type: (params.type ?? "task") as InboxMessage["type"],
          content: params.message,
        })

        const status = AgentManager.getStatus(params.to)
        if (status === "idle") {
          yield* drainInbox(params.to, promptService, sessions).pipe(Effect.forkDetach)
        }

        return {
          title: "send_message",
          metadata: { to: params.to } as Record<string, unknown>,
          output: `Message sent to agent "${params.to}".`,
        }
      }).pipe(Effect.orDie) as Effect.Effect<Tool.ExecuteResult<Record<string, unknown>>>

    return {
      description: "Send an asynchronous message to an agent",
      parameters: Parameters,
      jsonSchema: ToolJsonSchema.fromSchema(Parameters),
      execute,
    }
  }),
)

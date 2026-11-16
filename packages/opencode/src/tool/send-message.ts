import * as Tool from "./tool"
import { ToolJsonSchema } from "./json-schema"
import { AgentManager } from "@/agent/manager"
import { Agent } from "@/agent/agent"
import { InboxStore } from "@/agent/inbox-store"
import type { InboxRow } from "@/agent/inbox-store"
import { Session } from "@/session/session"
import { Service as SessionPromptService } from "@/session/prompt"
import { Effect, Exit, Schema } from "effect"
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

const restoredAgents = new Set<string>()

const restoreInbox = (agentId: string) =>
  Effect.gen(function* () {
    if (restoredAgents.has(agentId)) return
    restoredAgents.add(agentId)
    const rows = yield* InboxStore.list(agentId).pipe(
      Effect.catch((err) =>
        Effect.sync(() => {
          a2aLog.warn("inbox restore failed", { agentId, error: String(err) })
          return [] as InboxRow[]
        }),
      ),
    )
    // Skip rows that are already queued in the in-memory inbox: the
    // send_message that triggered this drain appended its row to SQLite
    // and pushed the same message in-memory, so restoring it again would
    // inject the message twice. Restored rows are prepended so older
    // (recovered) messages are processed before newer ones.
    const queued = new Set(
      AgentManager.get(agentId)?.inbox.map((msg) => msg.id).filter((msgId): msgId is string => !!msgId) ?? [],
    )
    const fresh: InboxMessage[] = []
    for (const row of rows) {
      if (queued.has(row.id)) continue
      const type = (["task", "question", "summary", "result"].includes(row.type) ? row.type : "task") as InboxMessage["type"]
      fresh.push({ id: row.id, from: row.sender, type, content: row.content })
    }
    if (fresh.length > 0) AgentManager.unshiftInbox(agentId, fresh)
    if (rows.length > 0) a2aLog.info("inbox restored", { agentId, count: rows.length, fresh: fresh.length })
  })

const drainInbox = (
  agentId: string,
  promptService: SessionPromptInterface,
  sessions: Session.Interface,
) =>
  Effect.gen(function* () {
    yield* restoreInbox(agentId)
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
        AgentManager.unshiftInbox(agentId, msgs)
        AgentManager.setStatus(agentId, "idle")
        a2aLog.info("drainInbox no session, requeued", { agentId })
        return
      }
      const parts = (msgs as InboxMessage[]).map(msg => ({
        type: "text" as const,
        text: `A2A [From ${msg.from} (${msg.type})]: ${msg.content}`,
      }))
      a2aLog.info("drainInbox calling prompt", { agentId, partsCount: parts.length })
      const exit = yield* promptService.prompt({
        sessionID: entry.sessionID as any,
        agent: agentId,
        parts,
      }).pipe(Effect.exit)
      if (Exit.isFailure(exit)) {
        AgentManager.unshiftInbox(agentId, msgs)
        AgentManager.setStatus(agentId, "idle")
        a2aLog.warn("drainInbox prompt failed, requeued", { agentId, error: String(exit.cause) })
        return
      }
      a2aLog.info("drainInbox prompt returned", { agentId })
      const ids = msgs.map((msg) => msg.id).filter((msgId): msgId is string => !!msgId)
      if (ids.length > 0) {
        yield* InboxStore.remove(ids).pipe(
          Effect.catch((err) =>
            Effect.sync(() => {
              a2aLog.warn("inbox cleanup failed", { agentId, error: String(err) })
            }),
          ),
        )
      }
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

        // Route the message to a task-scoped session: reuse the session
        // already serving this sender session, route replies back to the
        // delegating session, or open a fresh session for a new exchange.
        // Never reuse the target's most-recently-used session: that sent
        // delegations into stale sessions from unrelated earlier tasks.
        const resolved = AgentManager.resolveTargetSession(params.to, ctx.sessionID, ctx.agent)
        if (resolved) {
          AgentManager.setActive(params.to, resolved)
        } else {
          const info = yield* sessions.create({ agent: params.to })
          AgentManager.recordDelegation({
            id: params.to,
            name: params.to,
            senderSessionID: ctx.sessionID,
            senderAgent: ctx.agent,
            sessionID: info.id,
          })
        }

        const caller = AgentManager.get(ctx.agent)
        if (!caller) {
          AgentManager.register({ id: ctx.agent, name: ctx.agent, sessionID: ctx.sessionID })
        } else if (!caller.sessionID) {
          AgentManager.register({ id: ctx.agent, name: ctx.agent, sessionID: ctx.sessionID })
        }

        const rowId = yield* InboxStore.append({
          agent: params.to,
          sender: ctx.agent,
          type: params.type ?? "task",
          content: params.message,
        }).pipe(
          Effect.catch((err) =>
            Effect.sync(() => {
              a2aLog.warn("inbox persist failed", { to: params.to, error: String(err) })
              return undefined as string | undefined
            }),
          ),
        )

        AgentManager.pushInbox(params.to, {
          id: rowId,
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

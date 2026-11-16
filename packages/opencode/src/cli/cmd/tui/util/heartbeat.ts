import type { createOpencodeClient } from "@opencode-ai/sdk/v2"
import { PartID } from "@/session/schema"

// Heartbeat: a per-session fallback timer for the event-driven A2A design.
//
// Event-driven delivery has no safety net: if an agent never sends its
// reply back, the waiting agent waits forever. The heartbeat fires a
// periodic check into the session so the agent re-examines its tasks,
// follows up on unreturned delegated work, and looks for intermediate
// output in the working directory.
//
// State is in-memory only and does not survive a process restart. The
// timer lives in the TUI process; injection reuses the existing
// session.prompt endpoint, which runs the same server-side prompt path
// that drainInbox uses. It never polls the inbox.

export type HeartbeatMode = "pure" | "task"

export const HEARTBEAT_INTERVALS = [1, 5, 15, 30] as const

export const HEARTBEAT_PROMPT_TASK =
  "[Heartbeat fallback check — this is a periodic safety check, not a user message. Check your task list: for each incomplete item, verify its real status. For work you delegated to other agents that hasn't come back, proactively send a message via send_message asking for status. Check the working directory for intermediate output to confirm actual progress. If everything is complete, say so briefly and stop waiting. Do not send bare acknowledgments.]"

export const HEARTBEAT_PROMPT_PURE =
  "[Heartbeat check — periodic safety check, not a user message. Review what you are currently waiting on: check the working directory for progress and, if you delegated work that hasn't returned, proactively follow up via send_message. Report briefly what you found. Do not send bare acknowledgments.]"

export interface HeartbeatState {
  sessionID: string
  mode: HeartbeatMode
  intervalMinutes: number
  startedAt: number
}

type Client = ReturnType<typeof createOpencodeClient>

interface Entry extends HeartbeatState {
  timer: Timer
  ticking: boolean
  agent: string
  model: { providerID: string; modelID: string }
  client: Client
  notify?: (message: string) => void
}

const entries = new Map<string, Entry>()

export function get(sessionID: string): HeartbeatState | undefined {
  const entry = entries.get(sessionID)
  if (!entry) return undefined
  return {
    sessionID: entry.sessionID,
    mode: entry.mode,
    intervalMinutes: entry.intervalMinutes,
    startedAt: entry.startedAt,
  }
}

export function stop(sessionID: string): boolean {
  const entry = entries.get(sessionID)
  if (!entry) return false
  clearInterval(entry.timer)
  entries.delete(sessionID)
  return true
}

export function start(input: {
  client: Client
  sessionID: string
  agent: string
  model: { providerID: string; modelID: string }
  mode: HeartbeatMode
  intervalMinutes: number
  notify?: (message: string) => void
}): HeartbeatState {
  stop(input.sessionID)
  const entry: Entry = {
    sessionID: input.sessionID,
    mode: input.mode,
    intervalMinutes: input.intervalMinutes,
    startedAt: Date.now(),
    timer: undefined as unknown as Timer,
    ticking: false,
    agent: input.agent,
    model: input.model,
    client: input.client,
    notify: input.notify,
  }
  entry.timer = setInterval(() => void tick(entry), input.intervalMinutes * 60 * 1000)
  entries.set(input.sessionID, entry)
  return get(input.sessionID)!
}

function isCurrent(entry: Entry) {
  return entries.get(entry.sessionID) === entry
}

async function tick(entry: Entry) {
  if (entry.ticking) return
  entry.ticking = true
  try {
    if (!isCurrent(entry)) return
    // Never interrupt an active turn: skip this tick and wait for the next.
    const status = await entry.client.session.status()
    const current = status.data?.[entry.sessionID]
    if (current && current.type !== "idle") return
    if (!isCurrent(entry)) return
    if (entry.mode === "task") {
      const todos = await entry.client.session.todo({ sessionID: entry.sessionID })
      const items = todos.data ?? []
      // An empty list does NOT deactivate: the agent may not have created
      // todos yet. Deactivate only when every item is resolved.
      if (
        items.length > 0 &&
        items.every((item) => item.status === "completed" || item.status === "cancelled")
      ) {
        stop(entry.sessionID)
        entry.notify?.("Heartbeat stopped: all tasks are complete.")
        return
      }
    }
    if (!isCurrent(entry)) return
    const result = await entry.client.session.prompt({
      sessionID: entry.sessionID,
      agent: entry.agent,
      model: entry.model,
      parts: [
        {
          id: PartID.ascending(),
          type: "text",
          text: entry.mode === "task" ? HEARTBEAT_PROMPT_TASK : HEARTBEAT_PROMPT_PURE,
        },
      ],
    })
    if (result.error) {
      stop(entry.sessionID)
      entry.notify?.("Heartbeat stopped: the check could not be delivered.")
    }
  } catch {
    stop(entry.sessionID)
  } finally {
    entry.ticking = false
  }
}

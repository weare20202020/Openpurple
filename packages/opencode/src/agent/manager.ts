import type { AgentStatus, InboxMessage } from "./types"

export interface AgentEntry {
  id: string
  name: string
  sessionID?: string
  sessionIDs: string[]
  status: AgentStatus
  inbox: InboxMessage[]
}

const agents = new Map<string, AgentEntry>()

const DEFAULT_AGENTS = [
  { id: "A", name: "Alice" },
  { id: "B", name: "Bob" },
  { id: "C", name: "Carol" },
]

for (const { id, name } of DEFAULT_AGENTS) {
  agents.set(id, { id, name, sessionIDs: [], status: "idle", inbox: [] })
}

export const AgentManager = {
  register(info: { id: string; name: string; sessionID?: string }) {
    const existing = agents.get(info.id)
    if (existing) {
      if (info.sessionID) {
        existing.sessionID = info.sessionID
        if (!existing.sessionIDs.includes(info.sessionID)) existing.sessionIDs.push(info.sessionID)
      }
      return
    }
    agents.set(info.id, {
      id: info.id,
      name: info.name,
      sessionID: info.sessionID,
      sessionIDs: info.sessionID ? [info.sessionID] : [],
      status: "idle",
      inbox: [],
    })
  },

  get(id: string): AgentEntry | undefined {
    return agents.get(id)
  },

  list(): AgentEntry[] {
    return Array.from(agents.values())
  },

  setActive(id: string, sessionID: string) {
    const entry = agents.get(id)
    if (!entry) return
    if (!entry.sessionIDs.includes(sessionID)) entry.sessionIDs.push(sessionID)
    entry.sessionID = sessionID
  },

  pushInbox(id: string, msg: InboxMessage) {
    const entry = agents.get(id)
    if (!entry) return
    entry.inbox.push(msg)
  },

  unshiftInbox(id: string, msgs: InboxMessage[]) {
    const entry = agents.get(id)
    if (!entry) return
    entry.inbox = [...msgs, ...entry.inbox]
  },

  drainMessages(id: string): InboxMessage[] {
    const entry = agents.get(id)
    if (!entry) return []
    const msgs = [...entry.inbox]
    entry.inbox = []
    return msgs
  },

  setStatus(id: string, status: AgentStatus) {
    const entry = agents.get(id)
    if (!entry) return
    entry.status = status
  },

  getStatus(id: string): AgentStatus | undefined {
    return agents.get(id)?.status
  },

  entries: agents,
}

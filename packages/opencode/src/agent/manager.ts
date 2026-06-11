import type { AgentStatus, InboxMessage } from "./types"

export interface AgentEntry {
  id: string
  name: string
  sessionID?: string
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
  agents.set(id, { id, name, status: "idle", inbox: [] })
}

export const AgentManager = {
  register(info: { id: string; name: string; sessionID?: string }) {
    if (agents.has(info.id)) {
      if (info.sessionID) agents.get(info.id)!.sessionID = info.sessionID
      return
    }
    agents.set(info.id, {
      id: info.id,
      name: info.name,
      sessionID: info.sessionID,
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

  pushInbox(id: string, msg: InboxMessage) {
    const entry = agents.get(id)
    if (!entry) return
    entry.inbox.push(msg)
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

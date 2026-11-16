import type { AgentStatus, InboxMessage } from "./types"

export interface AgentEntry {
  id: string
  name: string
  sessionID?: string
  sessionIDs: string[]
  status: AgentStatus
  inbox: InboxMessage[]
  // Task-scoped sessions: sender sessionID -> the session created for this
  // agent to serve that sender's delegation. Follow-ups from the same sender
  // session reuse the same task session instead of landing in whatever
  // session this agent happened to use most recently.
  taskSessions: Map<string, string>
}

const agents = new Map<string, AgentEntry>()

// sessionID -> the session (and its owner agent) whose send_message caused
// this session's creation. Lets a reply route back to the session that
// delegated the task instead of opening a fresh session the coordinator
// never sees.
const sessionParent = new Map<string, { parentSessionID: string; parentAgent: string }>()

const DEFAULT_AGENTS = [
  { id: "A", name: "Alice" },
  { id: "B", name: "Bob" },
  { id: "C", name: "Carol" },
]

for (const { id, name } of DEFAULT_AGENTS) {
  agents.set(id, { id, name, sessionIDs: [], status: "idle", inbox: [], taskSessions: new Map() })
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
      taskSessions: new Map(),
    })
  },

  // Resolve which session of `id` a message sent from `senderSessionID`
  // should land in. Returns undefined when no existing session fits, in
  // which case the caller creates a fresh task session. Resolution order:
  // 1. the task session already serving this sender session (continuation),
  // 2. the sender session's parent, when it belongs to the target agent
  //    (a reply back to the session that delegated the task),
  // 3. the sender's own session for self-messages.
  // Deliberately never falls back to the target's most-recently-used
  // session: that routed delegations into stale sessions from unrelated
  // earlier tasks and polluted their context.
  resolveTargetSession(id: string, senderSessionID: string, senderAgent: string): string | undefined {
    const entry = agents.get(id)
    if (!entry) return undefined
    if (id === senderAgent) return senderSessionID
    const task = entry.taskSessions.get(senderSessionID)
    if (task) return task
    const parent = sessionParent.get(senderSessionID)
    if (parent && parent.parentAgent === id) return parent.parentSessionID
    return undefined
  },

  // Record a freshly created task session for `id`, served from
  // `senderSessionID`, and point the agent's active binding at it.
  recordDelegation(info: {
    id: string
    name: string
    senderSessionID: string
    senderAgent: string
    sessionID: string
  }) {
    let entry = agents.get(info.id)
    if (!entry) {
      agents.set(info.id, {
        id: info.id,
        name: info.name,
        sessionIDs: [],
        status: "idle",
        inbox: [],
        taskSessions: new Map(),
      })
      entry = agents.get(info.id)!
    }
    entry.taskSessions.set(info.senderSessionID, info.sessionID)
    sessionParent.set(info.sessionID, { parentSessionID: info.senderSessionID, parentAgent: info.senderAgent })
    if (!entry.sessionIDs.includes(info.sessionID)) entry.sessionIDs.push(info.sessionID)
    entry.sessionID = info.sessionID
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

export type AgentStatus = "idle" | "busy"

export interface InboxMessage {
  id?: string
  from: string
  type: "task" | "question" | "summary" | "result"
  content: string
  metadata?: Record<string, unknown>
}

export interface AgentEntry {
  id: string
  name: string
  sessionID?: string
  sessionIDs: string[]
  status: AgentStatus
  inbox: InboxMessage[]
}

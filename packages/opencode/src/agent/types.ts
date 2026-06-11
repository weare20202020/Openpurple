export type AgentStatus = "idle" | "busy"

export interface InboxMessage {
  from: string
  type: "task" | "question" | "summary" | "result"
  content: string
  metadata?: Record<string, unknown>
}

export interface AgentEntry {
  id: string
  name: string
  sessionID?: string
  status: AgentStatus
  inbox: InboxMessage[]
}

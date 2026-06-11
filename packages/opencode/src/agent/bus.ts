import { Context, Effect, Layer, Schema } from "effect"

export const SessionID = Schema.String.pipe(Schema.brand("SessionID"))
export type SessionID = Schema.Schema.Type<typeof SessionID>

export interface AgentMessage {
  id: string
  timestamp: number
  from: string
  to: string
  type: "task" | "result" | "question" | "summary" | "broadcast"
  content: string
  metadata?: Record<string, unknown>
}

type Handler = (msg: AgentMessage) => Promise<void> | void

export interface AgentStatus {
  id: string
  working: boolean
  running: boolean
  lastSeen: number
  messageCount: number
}

export interface Interface {
  readonly register: (id: string, handler: Handler) => Effect.Effect<void>
  readonly unregister: (id: string) => Effect.Effect<void>
  readonly isOnline: (id: string) => Effect.Effect<boolean>
  readonly list: () => Effect.Effect<string[]>
  readonly send: (to: string, msg: Omit<AgentMessage, "id" | "timestamp">) => Effect.Effect<boolean>
  readonly broadcast: (msg: Omit<AgentMessage, "id" | "timestamp" | "to" | "type">) => Effect.Effect<void>
  readonly getHistory: (agentId?: string) => Effect.Effect<AgentMessage[]>
  readonly getAllStatus: () => Effect.Effect<AgentStatus[]>
  readonly on: (event: string, listener: (...args: any[]) => void) => Effect.Effect<void>
  readonly off: (event: string, listener: (...args: any[]) => void) => Effect.Effect<void>
  readonly updateStatus: (id: string, partial: Partial<AgentStatus>) => Effect.Effect<void>
  readonly onMessage: (listener: (msg: AgentMessage) => Effect.Effect<void>) => Effect.Effect<void>
  readonly offMessage: (listener: (msg: AgentMessage) => Effect.Effect<void>) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/AgentBus") {}

const MAX_HISTORY = 1000

const makeHandlers = () => new Map<string, Handler>()
const makeHistory = () => [] as AgentMessage[]
const makeStatusMap = () => new Map<string, AgentStatus>()
const makeListeners = () => new Set<(msg: AgentMessage) => Effect.Effect<void>>()

export const layer: Layer.Layer<Service, never, never> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const handlers = makeHandlers()
    const history = makeHistory()
    const statusMap = makeStatusMap()
    const listeners = makeListeners()

    const register: Interface["register"] = Effect.fn("AgentBus.register")(function* (id: string, handler: Handler) {
      handlers.set(id, handler)
      statusMap.set(id, { id, working: false, running: true, lastSeen: Date.now(), messageCount: 0 })
    })

    const unregister: Interface["unregister"] = Effect.fn("AgentBus.unregister")(function* (id: string) {
      handlers.delete(id)
      statusMap.delete(id)
    })

    const isOnline: Interface["isOnline"] = Effect.fn("AgentBus.isOnline")(function* (id: string) {
      return handlers.has(id)
    })

    const list: Interface["list"] = Effect.fn("AgentBus.list")(function* () {
      return Array.from(handlers.keys())
    })

    const send: Interface["send"] = Effect.fn("AgentBus.send")(function* (
      to: string,
      msg: Omit<AgentMessage, "id" | "timestamp">,
    ) {
      const full: AgentMessage = { id: crypto.randomUUID(), timestamp: Date.now(), ...msg }
      const handler = handlers.get(to)
      history.push(full)
      if (history.length > MAX_HISTORY) history.shift()
      const s = statusMap.get(to)
      if (s) { s.messageCount++; s.lastSeen = Date.now() }
      if (handler) {
        try { yield* Effect.promise(() => Promise.resolve(handler(full))) } catch {}
      }
      for (const listener of listeners) {
        yield* listener(full).pipe(Effect.ignore, Effect.forkDetach)
      }
      return !!handler
    })

    const broadcast: Interface["broadcast"] = Effect.fn("AgentBus.broadcast")(function* (
      msg: Omit<AgentMessage, "id" | "timestamp" | "to" | "type">,
    ) {
      for (const id of handlers.keys()) {
        yield* send(id, { ...msg, type: "broadcast", to: id })
      }
    })

    const getHistory: Interface["getHistory"] = Effect.fn("AgentBus.getHistory")(function* (agentId?: string) {
      return agentId ? history.filter(m => m.from === agentId || m.to === agentId) : [...history]
    })

    const getAllStatus: Interface["getAllStatus"] = Effect.fn("AgentBus.getAllStatus")(function* () {
      return Array.from(statusMap.values())
    })

    const handleOn: Interface["on"] = Effect.fn("AgentBus.on")(function* (event: string, listener: (...args: any[]) => void) {
      // no-op without EventEmitter
    })

    const handleOff: Interface["off"] = Effect.fn("AgentBus.off")(function* (event: string, listener: (...args: any[]) => void) {
      // no-op without EventEmitter
    })

    const onMessage: Interface["onMessage"] = Effect.fn("AgentBus.onMessage")(function* (listener: (msg: AgentMessage) => Effect.Effect<void>) {
      listeners.add(listener)
    })

    const offMessage: Interface["offMessage"] = Effect.fn("AgentBus.offMessage")(function* (listener: (msg: AgentMessage) => Effect.Effect<void>) {
      listeners.delete(listener)
    })

    const updateStatus: Interface["updateStatus"] = Effect.fn("AgentBus.updateStatus")(function* (
      id: string,
      partial: Partial<AgentStatus>,
    ) {
      const s = statusMap.get(id)
      if (s) {
        Object.assign(s, partial, { lastSeen: Date.now() })
      }
    })

    return Service.of({
      register, unregister, isOnline, list, send, broadcast, getHistory, getAllStatus,
      on: handleOn, off: handleOff, updateStatus, onMessage, offMessage,
    })
  }),
)

export const defaultLayer = layer
export const AgentBus = { Service, layer, defaultLayer }

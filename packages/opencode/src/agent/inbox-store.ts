import { Database } from "@opencode-ai/core/database/database"
import { sql } from "drizzle-orm"
import { Effect } from "effect"
import { randomUUID } from "crypto"

export interface InboxRow {
  id: string
  agent: string
  sender: string
  type: string
  content: string
  created: number
}

// Durable backing store for the in-memory AgentManager inbox. The in-memory
// map stays the runtime authority: this table is only a recovery log. Rows
// are appended when a message is queued and deleted once the receiving
// agent's turn completes, so a restart replays exactly the messages that
// were never processed. The table is created lazily and idempotently; it
// lives outside the core migration system on purpose.
const ensure = Effect.fn("InboxStore.ensure")(function* () {
  const { db } = yield* Database.Service
  yield* db.run(
    sql.raw(
      `CREATE TABLE IF NOT EXISTS a2a_inbox (id TEXT PRIMARY KEY, agent TEXT NOT NULL, sender TEXT NOT NULL, type TEXT NOT NULL, content TEXT NOT NULL, created INTEGER NOT NULL)`,
    ),
  )
})

export const append = Effect.fn("InboxStore.append")(function* (input: {
  agent: string
  sender: string
  type: string
  content: string
}) {
  yield* ensure()
  const { db } = yield* Database.Service
  const id = randomUUID()
  yield* db.run(
    sql`INSERT INTO a2a_inbox (id, agent, sender, type, content, created) VALUES (${id}, ${input.agent}, ${input.sender}, ${input.type}, ${input.content}, ${Date.now()})`,
  )
  return id
})

export const list = Effect.fn("InboxStore.list")(function* (agent: string) {
  yield* ensure()
  const { db } = yield* Database.Service
  return yield* db.all<InboxRow>(
    sql`SELECT id, agent, sender, type, content, created FROM a2a_inbox WHERE agent = ${agent} ORDER BY created ASC`,
  )
})

export const remove = Effect.fn("InboxStore.remove")(function* (ids: string[]) {
  if (ids.length === 0) return
  yield* ensure()
  const { db } = yield* Database.Service
  yield* db.run(sql`DELETE FROM a2a_inbox WHERE id IN (${sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )})`)
})

export * as InboxStore from "./inbox-store"

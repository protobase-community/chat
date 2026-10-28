import { loadProjectAuth } from '@protobase/cli/auth'
import { createUser } from '@protobase/server'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { seedDemoWorkspace } from '../seed/demo-workspace'
import { messages, people } from '../seed/demo-data'
import { root, throwawayDatabase } from './chat-server'

// The demo seed against Postgres: what it writes, and that running it again doubles nothing.

let database: Awaited<ReturnType<typeof throwawayDatabase>>
let sql: postgres.Sql

beforeAll(async () => {
  database = await throwawayDatabase()
  process.env.DATABASE_URL = database.databaseUrl
  sql = postgres(database.databaseUrl, { max: 1, onnotice: () => {} })
}, 120_000)

afterAll(async () => {
  await sql?.end()
  await database?.drop()
})

const counts = async () => {
  const [row] = await sql`
    select (select count(*)::int from auth."user") as users, (select count(*)::int from auth.organization) as workspaces,
      (select count(*)::int from auth.member) as members, (select count(*)::int from public.channels) as channels,
      (select count(*)::int from public.direct_messages) as direct_messages, (select count(*)::int from public.messages) as messages`
  return row
}

describe('the demo seed', () => {
  it('waits for the developer’s own account, so no demo person becomes a superuser', async () => {
    const auth = await loadProjectAuth(root)
    await expect(seedDemoWorkspace(auth, sql, new Date())).rejects.toThrow(/Create your own account first/)
  })

  it('writes a workspace with #general, #random, the private #launch, a direct message, three people, the developer and their conversation, once', async () => {
    const auth = await loadProjectAuth(root)
    await createUser(auth, { email: 'dev@example.com', role: 'admin' })
    const created = await seedDemoWorkspace(auth, sql, new Date())
    expect(created.map((person) => person.email)).toEqual(Object.values(people).map((person) => person.email))
    const first = await counts()
    expect(first).toEqual({ users: 4, workspaces: 1, members: 4, channels: 3, direct_messages: 1, messages: messages.length })

    expect(await seedDemoWorkspace(auth, sql, new Date())).toEqual([])
    expect(await counts()).toEqual(first)
  })

  it('makes the developer the workspace’s admin and moderator, so their own account sees the members and moderates', async () => {
    const [row] = await sql`
      select m.role, m.app_roles from auth.member m join auth."user" u on u.id = m.user_id where u.email = 'dev@example.com'`
    expect(row).toEqual({ role: 'admin', app_roles: ['moderator'] })
  })

  it('writes the replies in their thread, counted on its first message', async () => {
    const rows = await sql<{ body: string; reply_count: number; replies: string[] }[]>`
      select first.body, first.reply_count, array(select reply.body from public.messages reply where reply.thread_id = first.id order by reply.id) as replies
      from public.messages first where first.reply_count > 0`
    const replies = messages.filter((message) => message.replyTo !== undefined)
    expect(rows).toEqual([{ body: replies[0]!.replyTo, reply_count: replies.length, replies: replies.map((reply) => reply.body) }])
  })

  it('keeps the private channel and the direct message to Maya and Sam', async () => {
    const rows = await sql<{ name: string | null; members: string[] }[]>`
      select c.name, array(select u.email from jsonb_array_elements_text(c.member_ids) as m (id) join auth."user" u on u.id = m.id order by u.email) as members
      from public.channels c where c.kind = 'private'
      union all
      select null, array(select u.email from jsonb_array_elements_text(d.member_ids) as m (id) join auth."user" u on u.id = m.id order by u.email)
      from public.direct_messages d`
    expect(rows).toEqual([
      { name: 'launch', members: ['maya@example.com', 'sam@example.com'] },
      { name: null, members: ['maya@example.com', 'sam@example.com'] },
    ])
  })

  it('stores each mention as the id of the person named', async () => {
    const [row] = await sql<{ mentions: string[]; name: string }[]>`
      select m.mentions, u.name from public.messages m join auth."user" u on u.id = m.mentions ->> 0
      where m.body like '@Sam Okafor%'`
    expect(row).toEqual({ mentions: [expect.any(String)], name: 'Sam Okafor' })
  })
})

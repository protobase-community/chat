import { loadProjectAuth } from '@protobase/cli/auth'
import { createOrganization, createUser, type AdminAuth } from '@protobase/server'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { seedDemoWorkspace } from '../seed/demo-workspace'
import { resetDemoWorkspace } from '../seed/reset-demo-workspace'
import { root, throwawayDatabase } from './chat-server'

// The demo reset against Postgres: what a visitor wrote in the demo workspace goes, the seed's conversation comes back
// as it was, and another workspace keeps everything.

let database: Awaited<ReturnType<typeof throwawayDatabase>>
let sql: postgres.Sql
let auth: AdminAuth
const today = new Date('2026-10-28T12:00:00Z')

beforeAll(async () => {
  database = await throwawayDatabase()
  process.env.DATABASE_URL = database.databaseUrl
  sql = postgres(database.databaseUrl, { max: 1, onnotice: () => {} })
  auth = await loadProjectAuth(root)
  await createUser(auth, { email: 'dev@example.com', role: 'admin' })
  await seedDemoWorkspace(auth, sql, today)
}, 120_000)

afterAll(async () => {
  await sql?.end()
  await database?.drop()
})

const organizationId = async (slug: string) => {
  const [row] = await sql<{ id: string }[]>`select id from auth.organization where slug = ${slug}`
  return row!.id
}

const userId = async (email: string) => {
  const [row] = await sql<{ id: string }[]>`select id from auth."user" where email = ${email}`
  return row!.id
}

/** The demo workspace's conversations as the chat shows them, without the ids a reset renumbers. */
const demoState = async () => {
  const organization = await organizationId('demo')
  const channels = await sql`
    select name, topic, kind, member_ids, author_id from public.channels where organization_id = ${organization} order by name`
  const directMessages = await sql`
    select member_ids, author_id from public.direct_messages where organization_id = ${organization} order by member_key`
  const messages = await sql`
    select coalesce(c.name, 'direct message') as place, m.author_id, m.body, m.mentions, m.sent_at, m.edited_at,
      thread.body as thread, m.reply_count, m.last_reply_at
    from public.messages m
      left join public.channels c on c.id = m.channel_id
      left join public.messages thread on thread.id = m.thread_id
    where m.organization_id = ${organization} order by m.sent_at, m.body`
  const [others] = await sql`
    select (select count(*)::int from public.reactions where organization_id = ${organization}) as reactions,
      (select count(*)::int from public.read_positions where organization_id = ${organization}) as read_positions,
      (select count(*)::int from public.attachments where organization_id = ${organization}) as attachments`
  return { channels, directMessages, messages, others }
}

/** Every chat row of another workspace, ids included. */
const workspaceRows = async (organization: string) => ({
  channels: await sql`select * from public.channels where organization_id = ${organization} order by id`,
  messages: await sql`select * from public.messages where organization_id = ${organization} order by id`,
  reactions: await sql`select * from public.reactions where organization_id = ${organization} order by id`,
  readPositions: await sql`select * from public.read_positions where organization_id = ${organization} order by id`,
})

describe('the demo reset', () => {
  let seeded: Awaited<ReturnType<typeof demoState>>
  let southwind: string
  let southwindRows: Awaited<ReturnType<typeof workspaceRows>>
  const taken: string[][] = []
  const reset = () => resetDemoWorkspace(auth, sql, today, async (files) => void taken.push(files))

  beforeAll(async () => {
    seeded = await demoState()

    // Another workspace, with a channel, a message, a reaction and a read position of its own.
    await createUser(auth, { email: 'cara@example.com', name: 'Cara Lindqvist', password: 'a-long-password-1' })
    await createOrganization(auth, { name: 'Southwind', slug: 'southwind', owner: 'cara@example.com' })
    southwind = await organizationId('southwind')
    const cara = await userId('cara@example.com')
    await sql.begin(async (tx) => {
      await tx`set local changes.capture = 'off'`
      const [channel] = await tx<{ id: number }[]>`
        insert into public.channels (organization_id, name, topic, author_id) values (${southwind}, 'general', 'Ours', ${cara}) returning id`
      const [message] = await tx<{ id: number }[]>`
        insert into public.messages (organization_id, channel_id, author_id, body, mentions) values (${southwind}, ${channel!.id}, ${cara}, 'Hello Southwind', '[]') returning id`
      await tx`insert into public.reactions (organization_id, message_id, user_id, emoji) values (${southwind}, ${message!.id}, ${cara}, 'heart')`
      await tx`
        insert into public.read_positions (organization_id, user_id, channel_id, last_read_id) values (${southwind}, ${cara}, ${channel!.id}, ${message!.id})`
    })
    southwindRows = await workspaceRows(southwind)

    // A visitor signed in as Maya: a channel and a message of their own, a file, a reply, a reaction, an edit and a read
    // position in the demo workspace.
    const demo = await organizationId('demo')
    const maya = await userId('maya@example.com')
    await sql.begin(async (tx) => {
      await tx`set local changes.capture = 'off'`
      const [channel] = await tx<{ id: number }[]>`
        insert into public.channels (organization_id, name, topic, author_id) values (${demo}, 'visitors', 'Hi', ${maya}) returning id`
      const [message] = await tx<{ id: number }[]>`
        insert into public.messages (organization_id, channel_id, author_id, body, mentions) values (${demo}, ${channel!.id}, ${maya}, 'A visitor was here', '[]') returning id`
      await tx`
        insert into public.attachments (organization_id, message_id, author_id, file)
        values (${demo}, ${message!.id}, ${maya}, 'private:demo/visitor.png?name=visitor.png&size=3')`
      const [general] = await tx<{ id: number }[]>`select id from public.channels where organization_id = ${demo} and name = 'general'`
      const [first] = await tx<{ id: number }[]>`
        select id from public.messages where channel_id = ${general!.id} and thread_id is null order by id limit 1`
      await tx`
        insert into public.messages (organization_id, channel_id, thread_id, author_id, body, mentions) values (${demo}, ${general!.id}, ${first!.id}, ${maya}, 'A visitor’s reply', '[]')`
      await tx`insert into public.reactions (organization_id, message_id, user_id, emoji) values (${demo}, ${first!.id}, ${maya}, 'party')`
      await tx`update public.messages set body = 'Edited by a visitor' where id = ${first!.id}`
      await tx`update public.channels set topic = 'Renamed by a visitor' where id = ${general!.id}`
      await tx`
        insert into public.read_positions (organization_id, user_id, channel_id, last_read_id) values (${demo}, ${maya}, ${channel!.id}, ${message!.id})`
    })
    expect(await demoState()).not.toEqual(seeded)
  }, 60_000)

  it('takes a visitor’s message, channel, reaction, file and read position, and puts the seed’s conversation back', async () => {
    expect(await reset()).toEqual([])
    expect(await demoState()).toEqual(seeded)
    expect(seeded.others).toEqual({ reactions: 0, read_positions: 0, attachments: 0 })
  })

  it('hands over the visitor’s file for deletion', () => {
    expect(taken).toEqual([['private:demo/visitor.png?name=visitor.png&size=3']])
  })

  it('leaves the same state when it runs again', async () => {
    await reset()
    expect(await demoState()).toEqual(seeded)
    expect(taken.at(-1)).toEqual([])
  })

  it('leaves another workspace as it was', async () => {
    expect(await workspaceRows(southwind)).toEqual(southwindRows)
  })
})

import { randomBytes } from 'node:crypto'
import { loadProjectAuth } from '@protobase/cli/auth'
import { createUser } from '@protobase/server'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { root, startChat, throwawayDatabase } from './chat-server'

// A workspace made as the app makes one, through sign-in's create call, against Postgres: it starts with #general.

let chat: Awaited<ReturnType<typeof startChat>>
let database: Awaited<ReturnType<typeof throwawayDatabase>>
let sql: postgres.Sql
let cookie: string
let finnId: string

beforeAll(async () => {
  database = await throwawayDatabase()
  chat = await startChat(database.databaseUrl)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.PROTOBASE_URL = chat.url
  sql = postgres(database.databaseUrl, { max: 1, onnotice: () => {} })
  const auth = await loadProjectAuth(root)
  // The store's first account is the superuser: Finn is the second, an owner with no workspace yet.
  await createUser(auth, { email: 'admin@example.com', role: 'admin' })
  const password = randomBytes(12).toString('base64url')
  finnId = (await createUser(auth, { email: 'finn@example.com', name: 'Finn Berg', password })).id
  const signIn = await fetch(`${chat.url}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: chat.url },
    body: JSON.stringify({ email: 'finn@example.com', password }),
  })
  if (!signIn.ok) throw new Error(`Signing in answered ${signIn.status}`)
  cookie = signIn.headers.getSetCookie().map((each) => each.split(';')[0]).join('; ')
}, 180_000)

afterAll(async () => {
  await sql?.end()
  await chat?.stop()
  await database?.drop()
})

/** Creates a workspace as Finn, as the app's create step does, and answers its id. */
const createWorkspace = async (name: string, slug: string) => {
  const answer = await fetch(`${chat.url}/api/auth/organization/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: chat.url, cookie },
    body: JSON.stringify({ name, slug }),
  })
  if (!answer.ok) throw new Error(`Creating ${name} answered ${answer.status}: ${await answer.text()}`)
  return ((await answer.json()) as { id: string }).id
}

const channelsOf = (organizationId: string) =>
  sql`select name, kind, topic, member_ids, author_id from public.channels where organization_id = ${organizationId}`

describe('a new workspace', () => {
  it('starts with one public #general, its creator’s', async () => {
    const id = await createWorkspace('Northwind', 'northwind')
    expect(await channelsOf(id)).toEqual([{ name: 'general', kind: 'public', topic: null, member_ids: null, author_id: finnId }])
  })

  it('gets a #general of its own beside another workspace’s', async () => {
    const id = await createWorkspace('Southwind', 'southwind')
    expect((await channelsOf(id)).map((channel) => channel.name)).toEqual(['general'])
    const [all] = await sql<{ count: number }[]>`select count(*)::int from public.channels where name = 'general'`
    expect(all!.count).toBe(2)
  })
})

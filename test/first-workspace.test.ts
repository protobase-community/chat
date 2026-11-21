import { randomBytes } from 'node:crypto'
import { loadProjectAuth } from '@protobase/cli/auth'
import { createUser } from '@protobase/server'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { root, startChat, throwawayDatabase } from './chat-server'

// A workspace made as the app makes one, through sign-in's create call, against Postgres: it starts with #general, the
// record the app opens at `/`. Someone signed in with no workspace is shown the screen that creates one.

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
  sql`select name, kind, topic, member_ids, author_id, is_default from public.channels where organization_id = ${organizationId}`

/** The bearer headers of Finn's session, in the workspace it works in. */
const finnsToken = async () => {
  const answer = await fetch(`${chat.url}/api/auth/token`, { headers: { cookie, origin: chat.url } })
  if (!answer.ok) throw new Error(`A token answered ${answer.status}`)
  return { authorization: `Bearer ${((await answer.json()) as { token: string }).token}` }
}

/** The record `/` opens, as the app finds it: the first channel the Channels entry's start filter lists. */
const startRecord = async () => {
  const headers = await finnsToken()
  const meta = (await (await fetch(`${chat.url}/api/meta`, { headers })).json()) as { views: { resource: string; nav?: { start?: { filter: string } } }[] }
  const filter = meta.views.find((view) => view.resource === 'channels')!.nav!.start!.filter
  const answer = await fetch(`${chat.url}/api/v1/channels?filter=${encodeURIComponent(filter)}`, { headers })
  if (answer.status !== 200) throw new Error(await answer.text())
  return ((await answer.json()) as { items: { id: number; name: string }[] }).items[0]
}

describe('someone signed in with no workspace', () => {
  // The app sends whoever is in no organization to its create screen, /-/first-organization.
  it('is in none, so the app shows them the screen that creates one', async () => {
    const answer = await fetch(`${chat.url}/api/auth/organization/list`, { headers: { cookie, origin: chat.url } })
    expect(answer.status).toBe(200)
    expect(await answer.json()).toEqual([])
  })
})

describe('a new workspace', () => {
  it('starts with one public #general, its creator’s, the channel it opens at', async () => {
    const id = await createWorkspace('Northwind', 'northwind')
    expect(await channelsOf(id)).toEqual([{ name: 'general', kind: 'public', topic: null, member_ids: null, author_id: finnId, is_default: true }])
  })

  it('opens its #general at /, the address creating it reloads at', async () => {
    const [general] = await sql<{ id: number }[]>`
      select c.id from public.channels c join auth.organization o on o.id = c.organization_id where o.slug = 'northwind'`
    expect(await startRecord()).toMatchObject({ id: general!.id, name: 'general' })
  })

  it('gets a #general of its own beside another workspace’s', async () => {
    const id = await createWorkspace('Southwind', 'southwind')
    expect((await channelsOf(id)).map((channel) => channel.name)).toEqual(['general'])
    const [all] = await sql<{ count: number }[]>`select count(*)::int from public.channels where name = 'general'`
    expect(all!.count).toBe(2)
  })
})

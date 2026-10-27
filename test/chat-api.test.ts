import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startChat, throwawayDatabase } from './chat-server'
import { followLive } from './live-stream'
import { ana, ben, cara, makeWorkspaces } from './workspaces'

// The chat's rules as the running app enforces them, against Postgres: who a message is from, which workspace sees
// what, which channel a message may go into, and who hears of a new one.

type Headers = Record<string, string>
let chat: Awaited<ReturnType<typeof startChat>>
let database: Awaited<ReturnType<typeof throwawayDatabase>>
let people: Record<'ana' | 'ben' | 'cara', Headers>
let ids: Record<'ana' | 'ben' | 'cara', string>
let general: number

const api = (path: string, headers: Headers, init: RequestInit = {}) =>
  fetch(`${chat.url}/api/v1${path}`, { ...init, headers: { ...headers, 'content-type': 'application/json' } })
const post = (path: string, headers: Headers, body: unknown) => api(path, headers, { method: 'POST', body: JSON.stringify(body) })

beforeAll(async () => {
  database = await throwawayDatabase()
  chat = await startChat(database.databaseUrl)
  const workspaces = await makeWorkspaces(database.databaseUrl, chat.url)
  people = { ana: await workspaces.as(ana), ben: await workspaces.as(ben), cara: await workspaces.as(cara) }
  ids = workspaces.ids
  const created = await post('/channels', people.ana, { name: 'general', topic: 'Everything' })
  if (created.status !== 201) throw new Error(`Creating #general answered ${created.status}: ${await created.text()}`)
  general = (await created.json()).id
}, 180_000)

afterAll(async () => {
  await chat?.stop()
  await database?.drop()
})

describe('a message', () => {
  it('is from the person who posts it', async () => {
    const posted = await post('/messages', people.ben, { channel_id: general, body: 'Hello', mentions: [] })
    expect(posted.status).toBe(201)
    const message = await posted.json()
    expect(message.author_id).toBe(ids.ben)
    expect((await (await api(`/messages/${message.id}`, people.ana)).json()).author_id).toBe(ids.ben)
  })

  it('cannot name its author', async () => {
    const posted = await post('/messages', people.ben, { channel_id: general, body: 'As Ana', mentions: [], author_id: 'someone-else' })
    expect(posted.status).toBe(400)
  })

  it('keeps the people it mentions', async () => {
    const posted = await post('/messages', people.ana, { channel_id: general, body: '@Ben Adeyemi look', mentions: [ids.ben] })
    expect(posted.status).toBe(201)
    expect((await posted.json()).mentions).toEqual([ids.ben])
  })

  it('refuses mentions that are not a list of user ids', async () => {
    for (const mentions of ['ben-id', [1], Array.from({ length: 21 }, (_, index) => `id-${index}`)]) {
      expect((await post('/messages', people.ana, { channel_id: general, body: 'Hm', mentions })).status).toBe(400)
    }
  })

  it('goes only into a channel of its own workspace that exists', async () => {
    expect((await post('/messages', people.cara, { channel_id: general, body: 'Hi from Southwind', mentions: [] })).status).toBe(403)
    expect((await post('/messages', people.ana, { channel_id: 999_999, body: 'Into nothing', mentions: [] })).status).toBe(403)
  })
})

describe('another workspace', () => {
  it('neither lists nor reads the channels and messages', async () => {
    const channels = await (await api('/channels', people.cara)).json()
    expect(channels.items).toEqual([])
    expect((await api(`/channels/${general}`, people.cara)).status).toBe(404)
    const messages = await (await api(`/messages?filter=${encodeURIComponent(`channel_id = ${general}`)}`, people.cara)).json()
    expect(messages.items).toEqual([])
  })

  it('has channels of its own, of the same name', async () => {
    expect((await post('/channels', people.cara, { name: 'general' })).status).toBe(201)
    const names = (await (await api('/channels', people.ana)).json()).items.map((channel: { name: string }) => channel.name)
    expect(names).toEqual(['general'])
  })
})

describe('a channel', () => {
  it('is from the person who starts it, who cannot name another', async () => {
    const channel = await (await api(`/channels/${general}`, people.ben)).json()
    expect(channel.author_id).toBe(ids.ana)
    expect((await post('/channels', people.ben, { name: 'random', author_id: 'someone-else' })).status).toBe(400)
  })
})

describe('the PostgREST-compatible API', () => {
  it('is not served, so nothing writes around the access rules', async () => {
    const answer = await fetch(`${chat.url}/api/sb/rest/v1/messages`, { headers: people.ana })
    expect(answer.status).toBe(404)
  })
})

describe('the live stream', () => {
  it('tells the workspace of a new message, and no one else', async () => {
    const bens = await followLive(chat.url, people.ben)
    const caras = await followLive(chat.url, people.cara)
    const posted = await (await post('/messages', people.ana, { channel_id: general, body: 'Live?', mentions: [] })).json()
    const heard = await bens.changes((change) => change.resource === 'messages' && String(change.key) === String(posted.id), 10_000)
    expect(heard).toBe(true)
    expect(await caras.changes((change) => change.resource === 'messages', 3_000)).toBe(false)
    bens.stop()
    caras.stop()
  }, 30_000)
})

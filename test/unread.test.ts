import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { unreadFilter, type ReadUpTo } from '../components/unread-filter'
import { startChat, throwawayDatabase } from './chat-server'
import { ana, ben, dan, makeWorkspaces, superuser } from './workspaces'

// Read positions and unread counts as the running app keeps them, against Postgres: each person reads and moves only
// their own position, and counts only the messages they may read. Ana, Ben and Dan share Northwind; Dan is not in
// Ana and Ben's private channel.

type Headers = Record<string, string>
type Who = 'ana' | 'ben' | 'dan' | 'superuser'
let chat: Awaited<ReturnType<typeof startChat>>
let database: Awaited<ReturnType<typeof throwawayDatabase>>
let people: Record<Who, Headers>
let ids: Record<'ana' | 'ben' | 'dan', string>

const api = (path: string, headers: Headers, init: RequestInit = {}) =>
  fetch(`${chat.url}/api/v1${path}`, { ...init, headers: { ...headers, 'content-type': 'application/json' } })
const send = (method: string, path: string, headers: Headers, body: unknown) => api(path, headers, { method, body: JSON.stringify(body) })
const created = async (answer: Response) => {
  if (answer.status !== 201) throw new Error(`A create answered ${answer.status}: ${await answer.text()}`)
  return answer.json()
}
const say = (who: Who, channel_id: number, body: string, mentions: string[] = []) =>
  send('POST', '/messages', people[who], { channel_id, body, mentions }).then(created)
/** The unread messages per channel `who` counts, by channel id, as the sidebar asks for them. */
const unread = async (who: 'ana' | 'ben' | 'dan', channels: ReadUpTo[], mentioned = false) => {
  const filter = unreadFilter('channel_id', ids[who], channels, mentioned)!
  const answer = await api(`/messages:aggregate?group_by=channel_id&filter=${encodeURIComponent(filter)}`, people[who])
  expect(answer.status).toBe(200)
  const { groups } = (await answer.json()) as { groups: { value: number; count: number }[] }
  return Object.fromEntries(groups.map((group) => [group.value, group.count]))
}

beforeAll(async () => {
  database = await throwawayDatabase()
  chat = await startChat(database.databaseUrl)
  const workspaces = await makeWorkspaces(database.databaseUrl, chat.url)
  people = { ana: await workspaces.as(ana), ben: await workspaces.as(ben), dan: await workspaces.as(dan), superuser: await workspaces.as(superuser) }
  ids = workspaces.ids
}, 180_000)

afterAll(async () => {
  await chat?.stop()
  await database?.drop()
})

describe('a read position', () => {
  let general: { id: number }
  let position: { id: number; user_id: string }

  beforeAll(async () => {
    general = await created(await send('POST', '/channels', people.ana, { name: 'general' }))
    position = await created(await send('POST', '/read_positions', people.ana, { channel_id: general.id, last_read_id: 5 }))
  })

  it('is its reader’s, whoever they say it is of', async () => {
    expect(position.user_id).toBe(ids.ana)
    expect((await send('POST', '/read_positions', people.ben, { channel_id: general.id, last_read_id: 1, user_id: ids.ana })).status).toBe(400)
  })

  it('is neither read nor moved by anyone else, the superuser included', async () => {
    for (const who of ['ben', 'superuser'] as const) {
      const listed = await (await api('/read_positions', people[who])).json()
      expect(listed.items).toEqual([])
      expect((await api(`/read_positions/${position.id}`, people[who])).status).toBe(404)
      const moved = await api(`/read_positions/${position.id}`, { ...people[who], 'if-match': '*' }, { method: 'PATCH', body: JSON.stringify({ last_read_id: 0 }) })
      expect(moved.status).toBe(404)
    }
    expect((await (await api(`/read_positions/${position.id}`, people.ana)).json()).last_read_id).toBe(5)
  })

  it('only moves forward', async () => {
    const move = (last_read_id: number) =>
      api(`/read_positions/${position.id}`, { ...people.ana, 'if-match': '*' }, { method: 'PATCH', body: JSON.stringify({ last_read_id }) })
    expect((await (await move(9)).json()).last_read_id).toBe(9)
    expect((await (await move(3)).json()).last_read_id).toBe(9)
  })

  it('is one per person and conversation', async () => {
    expect((await send('POST', '/read_positions', people.ana, { channel_id: general.id, last_read_id: 1 })).status).toBe(409)
    expect((await send('POST', '/read_positions', people.ben, { channel_id: general.id, last_read_id: 1 })).status).toBe(201)
  })

  it('is kept only in a conversation its reader may read', async () => {
    const plans = await created(await send('POST', '/channels', people.ana, { name: 'plans', kind: 'private', member_ids: [ids.ben] }))
    expect((await send('POST', '/read_positions', people.dan, { channel_id: plans.id, last_read_id: 1 })).status).toBe(403)
  })
})

describe('the unread messages', () => {
  let lobby: { id: number }
  let plans: { id: number }

  beforeAll(async () => {
    lobby = await created(await send('POST', '/channels', people.ana, { name: 'lobby' }))
    plans = await created(await send('POST', '/channels', people.ana, { name: 'secret-plans', kind: 'private', member_ids: [ids.ben] }))
  })

  it('are the others’ messages after the read position, never one’s own', async () => {
    const read = await say('ana', lobby.id, 'Read already')
    await say('ana', lobby.id, 'Hello all')
    await say('ben', lobby.id, 'Hi Ana', [ids.ana])
    await say('ana', lobby.id, 'Hi @Dan', [ids.dan])
    expect(await unread('ben', [{ id: lobby.id, lastReadId: read.id }])).toEqual({ [lobby.id]: 2 })
    expect(await unread('ana', [{ id: lobby.id, lastReadId: read.id }])).toEqual({ [lobby.id]: 1 })
    expect(await unread('dan', [{ id: lobby.id, lastReadId: 0 }], true)).toEqual({ [lobby.id]: 1 })
    expect(await unread('ben', [{ id: lobby.id, lastReadId: 0 }], true)).toEqual({})
  })

  it('leave out replies in threads, which are not in the conversation’s flow', async () => {
    const quiet = await created(await send('POST', '/channels', people.ana, { name: 'quiet' }))
    const thread = await say('ana', quiet.id, 'Thoughts?')
    await send('POST', '/messages', people.ben, { channel_id: quiet.id, thread_id: thread.id, body: 'Yes, @Ana', mentions: [ids.ana] }).then(created)
    expect(await unread('ana', [{ id: quiet.id, lastReadId: thread.id }])).toEqual({})
    expect(await unread('ana', [{ id: quiet.id, lastReadId: thread.id }], true)).toEqual({})
  })

  it('leave out a private channel’s messages for someone outside it, though they name the channel', async () => {
    await say('ana', plans.id, 'Only for Ben and me, @Dan', [ids.dan])
    const both = [{ id: lobby.id, lastReadId: 0 }, { id: plans.id, lastReadId: 0 }]
    expect(Object.keys(await unread('dan', both))).toEqual([String(lobby.id)])
    expect(await unread('dan', both, true)).toEqual({ [lobby.id]: 1 })
    expect(Object.keys(await unread('ben', both)).sort()).toEqual([String(lobby.id), String(plans.id)].sort())
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startChat, throwawayDatabase } from './chat-server'
import { followLive } from './live-stream'
import { ana, ben, dan, makeWorkspaces } from './workspaces'

// Replies in threads as the running app enforces them, against Postgres: a reply is in its thread, of its thread's own
// conversation and out of its flow, read and written only by those who read the conversation, counted on the thread's
// first message and heard of live. Ana, Ben and Dan share Northwind; Dan is not in Ana and Ben's private channel.

type Headers = Record<string, string>
type Who = 'ana' | 'ben' | 'dan'
type Message = { id: number; channel_id: number; body: string; thread_id: number | null; reply_count: number; last_reply_at: string | null; sent_at: string }
let chat: Awaited<ReturnType<typeof startChat>>
let database: Awaited<ReturnType<typeof throwawayDatabase>>
let people: Record<Who, Headers>
let ids: Record<Who, string>
let general: { id: number }
let plans: { id: number }

const api = (path: string, headers: Headers, init: RequestInit = {}) =>
  fetch(`${chat.url}/api/v1${path}`, { ...init, headers: { ...headers, 'content-type': 'application/json' } })
const post = (who: Who, body: unknown) => api('/messages', people[who], { method: 'POST', body: JSON.stringify(body) })
const created = async (answer: Response) => {
  if (answer.status !== 201) throw new Error(`A create answered ${answer.status}: ${await answer.text()}`)
  return (await answer.json()) as Message
}
const say = (who: Who, channel_id: number, body: string) => post(who, { channel_id, body, mentions: [] }).then(created)
const reply = (who: Who, thread: { id: number; channel_id?: number }, body: string, channel_id = thread.channel_id) => post(who, { channel_id, thread_id: thread.id, body, mentions: [] })
const remove = (who: Who, id: number) => api(`/messages/${id}`, { ...people[who], 'if-match': '*' }, { method: 'DELETE' })
const list = async (who: Who, filter: string) => {
  const answer = await api(`/messages?filter=${encodeURIComponent(filter)}&order_by=${encodeURIComponent('id asc')}`, people[who])
  expect(answer.status).toBe(200)
  return ((await answer.json()) as { items: Message[] }).items
}
const read = async (who: Who, id: number) => (await api(`/messages/${id}`, people[who])).json() as Promise<Message>

beforeAll(async () => {
  database = await throwawayDatabase()
  chat = await startChat(database.databaseUrl)
  const workspaces = await makeWorkspaces(database.databaseUrl, chat.url)
  people = { ana: await workspaces.as(ana), ben: await workspaces.as(ben), dan: await workspaces.as(dan) }
  ids = workspaces.ids
  general = await created(await api('/channels', people.ana, { method: 'POST', body: JSON.stringify({ name: 'general' }) }))
  plans = await created(await api('/channels', people.ana, { method: 'POST', body: JSON.stringify({ name: 'plans', kind: 'private', member_ids: [ids.ben] }) }))
}, 180_000)

afterAll(async () => {
  await chat?.stop()
  await database?.drop()
})

describe('a reply', () => {
  it('is in its thread, in order, and out of the conversation’s messages', async () => {
    const first = await say('ana', general.id, 'Who takes the release?')
    const one = await created(await reply('ben', first, 'I can'))
    const two = await created(await reply('dan', first, 'I can help'))
    expect(one.thread_id).toBe(first.id)
    expect((await list('dan', `channel_id = ${general.id} AND isNull(thread_id)`)).map((message) => message.id)).not.toContain(one.id)
    expect((await list('dan', `thread_id = ${first.id}`)).map((message) => message.id)).toEqual([one.id, two.id])
  })

  it('counts on its thread’s first message, with the time of the last, which others hear of live', async () => {
    const first = await say('ana', general.id, 'Lunch?')
    expect(first).toMatchObject({ reply_count: 0, last_reply_at: null })
    const live = await followLive(chat.url, people.ana)
    const answer = await created(await reply('ben', first, 'Yes'))
    expect(await live.changes((change) => change.resource === 'messages' && String(change.key) === String(first.id) && change.operation === 'update', 10_000)).toBe(true)
    live.stop()
    expect(await read('ana', first.id)).toMatchObject({ reply_count: 1, last_reply_at: answer.sent_at })
    expect((await remove('ben', answer.id)).status).toBe(204)
    expect(await read('ana', first.id)).toMatchObject({ reply_count: 0, last_reply_at: null })
  })

  it('stays with a private channel’s members: refused and unseen outside it', async () => {
    const first = await say('ben', plans.id, 'Just us')
    const answer = await created(await reply('ana', first, 'Agreed'))
    expect((await reply('dan', first, 'Me too')).status).toBe(403)
    expect(await list('dan', `thread_id = ${first.id}`)).toEqual([])
    expect((await api(`/messages/${answer.id}`, people.dan)).status).toBe(404)
    expect(await list('ben', `thread_id = ${first.id}`)).toHaveLength(1)
  })

  it('is in its thread’s conversation alone, and never answers a reply', async () => {
    const first = await say('ana', general.id, 'Pick a date')
    expect((await reply('ana', first, 'Elsewhere', plans.id)).status).toBe(409)
    expect((await post('ana', { thread_id: first.id, body: 'Nowhere', mentions: [] })).status).toBe(400)
    const answer = await created(await reply('ben', first, 'Friday'))
    expect((await reply('ana', answer, 'Friday it is')).status).toBe(400)
    expect((await api(`/messages/${answer.id}`, { ...people.ben, 'if-match': '*' }, { method: 'PATCH', body: JSON.stringify({ thread_id: null }) })).status).toBe(400)
  })

  it('works in a direct message as in a channel, kept to its members', async () => {
    const between = await created(await api('/direct_messages', people.ana, { method: 'POST', body: JSON.stringify({ member_ids: [ids.ben] }) }))
    const first = await created(await post('ana', { direct_message_id: between.id, body: 'Coffee?', mentions: [] }))
    const answer = await created(await post('ben', { direct_message_id: between.id, thread_id: first.id, body: 'Sure', mentions: [] }))
    expect(answer.thread_id).toBe(first.id)
    expect((await post('dan', { direct_message_id: between.id, thread_id: first.id, body: 'Me too', mentions: [] })).status).toBe(403)
    expect(await list('dan', `thread_id = ${first.id}`)).toEqual([])
    expect(await read('ana', first.id)).toMatchObject({ reply_count: 1 })
  })

  it('keeps its thread’s first message from being deleted, so nobody’s replies go with it', async () => {
    const first = await say('ana', general.id, 'Keep this thread')
    const answer = await created(await reply('ben', first, 'Kept'))
    expect((await remove('ana', first.id)).status).toBe(409)
    expect((await read('ben', answer.id)).body).toBe('Kept')
    expect((await remove('ben', answer.id)).status).toBe(204)
    expect((await remove('ana', first.id)).status).toBe(204)
  })
})

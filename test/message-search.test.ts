import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startChat, throwawayDatabase } from './chat-server'
import { ana, ben, cara, dan, makeWorkspaces } from './workspaces'

// Message search as the running app serves it, against Postgres: the messages API's `search(...)`, which the top bar's
// search and the messages list send, finds a message by the words of its body, only in the conversations its reader
// reads, with where it was written. Ana, Ben and Dan share Northwind, Cara is alone in Southwind; Dan is not in
// Ana and Ben's private channel.

type Headers = Record<string, string>
type Who = 'ana' | 'ben' | 'cara' | 'dan'
type Message = { id: number; channel_id: number | null; direct_message_id: number | null; thread_id: number | null; body: string }
let chat: Awaited<ReturnType<typeof startChat>>
let database: Awaited<ReturnType<typeof throwawayDatabase>>
let people: Record<Who, Headers>
let ids: Record<Who, string>
let general: number

const api = (path: string, headers: Headers, init: RequestInit = {}) =>
  fetch(`${chat.url}/api/v1${path}`, { ...init, headers: { ...headers, 'content-type': 'application/json' } })
const created = async <T>(answer: Response) => {
  if (answer.status !== 201) throw new Error(`A create answered ${answer.status}: ${await answer.text()}`)
  return (await answer.json()) as T
}
const post = (who: Who, path: string, body: unknown) => api(path, people[who], { method: 'POST', body: JSON.stringify(body) })
const say = (who: Who, place: Record<string, number>, body: string) => post(who, '/messages', { ...place, body, mentions: [] }).then(created<Message>)
/** The messages `who` finds for `text`, newest first, as the messages list asks for them. */
const search = async (who: Who, text: string) => {
  const filter = `search(${JSON.stringify(text)})`
  const answer = await api(`/messages?filter=${encodeURIComponent(filter)}&order_by=${encodeURIComponent('id desc')}`, people[who])
  expect(answer.status).toBe(200)
  return ((await answer.json()) as { items: Message[] }).items
}
const found = async (who: Who, text: string) => (await search(who, text)).map((message) => message.id)

beforeAll(async () => {
  database = await throwawayDatabase()
  chat = await startChat(database.databaseUrl)
  const workspaces = await makeWorkspaces(database.databaseUrl, chat.url)
  people = { ana: await workspaces.as(ana), ben: await workspaces.as(ben), cara: await workspaces.as(cara), dan: await workspaces.as(dan) }
  ids = workspaces.ids
  general = workspaces.general.northwind
}, 180_000)

afterAll(async () => {
  await chat?.stop()
  await database?.drop()
})

describe('message search', () => {
  it('finds a message by every word it holds, ignoring case, in a channel', async () => {
    const said = await say('ana', { channel_id: general }, 'The Quarterly roadmap is ready')
    expect(await found('dan', 'quarterly ROADMAP')).toEqual([said.id])
    expect(await found('dan', 'quarterly budget')).toEqual([])
  })

  it('finds a word posted in a private channel for its members and never for anyone else', async () => {
    const plans = await created<{ id: number }>(await post('ana', '/channels', { name: 'plans', kind: 'private', member_ids: [ids.ben] }))
    const said = await say('ben', { channel_id: plans.id }, 'The pineapple launch is on')
    expect(await found('ana', 'pineapple')).toEqual([said.id])
    expect(await found('ben', 'pineapple')).toEqual([said.id])
    expect(await found('dan', 'pineapple')).toEqual([])
    expect(await found('cara', 'pineapple')).toEqual([])
  })

  it('finds a direct message for its people only', async () => {
    const conversation = await created<{ id: number }>(await post('ana', '/direct_messages', { member_ids: [ids.ben] }))
    const said = await say('ana', { direct_message_id: conversation.id }, 'Lunch at the mangosteen place?')
    expect(await found('ben', 'mangosteen')).toEqual([said.id])
    expect(await found('dan', 'mangosteen')).toEqual([])
  })

  it('finds a reply with its conversation and its thread', async () => {
    const first = await say('ana', { channel_id: general }, 'Who takes the release?')
    const reply = await say('dan', { channel_id: general, thread_id: first.id }, 'I take the kumquat release')
    const [hit] = await search('ben', 'kumquat')
    expect(hit).toMatchObject({ id: reply.id, channel_id: general, thread_id: first.id })
  })

  it('no longer finds a deleted message', async () => {
    const said = await say('ana', { channel_id: general }, 'A typo about durian')
    expect(await found('ben', 'durian')).toEqual([said.id])
    expect((await api(`/messages/${said.id}`, { ...people.ana, 'if-match': '*' }, { method: 'DELETE' })).status).toBe(204)
    expect(await found('ben', 'durian')).toEqual([])
  })

  it('lists the newest match first', async () => {
    const older = await say('ana', { channel_id: general }, 'Standup notes, lychee edition')
    const newer = await say('ben', { channel_id: general }, 'More lychee notes')
    expect(await found('dan', 'lychee')).toEqual([newer.id, older.id])
  })
})

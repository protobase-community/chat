import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startChat, throwawayDatabase } from './chat-server'
import { followLive } from './live-stream'
import { ana, ben, dan, makeWorkspaces, superuser } from './workspaces'

// Private channels and direct messages as the running app enforces them, against Postgres: only their members list,
// read and post in them, through the API's access rules. Ana, Ben and Dan share Northwind; Dan is in neither.

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
const listed = async (path: string, who: Who, filter?: string) => {
  const query = filter ? `?filter=${encodeURIComponent(filter)}` : ''
  const answer = await api(`${path}${query}`, people[who])
  expect(answer.status).toBe(200)
  return (await answer.json()).items as { id: number }[]
}
/** A PATCH as `who`, with the record's ETag as `owner` reads it, as the app sends one. */
const change = async (path: string, who: Who, body: unknown, owner: Who = who) => {
  const etag = (await api(path, people[owner])).headers.get('etag') ?? '*'
  return api(path, { ...people[who], 'if-match': etag }, { method: 'PATCH', body: JSON.stringify(body) })
}
const message = (who: Who, place: Record<string, number>, body: string) => send('POST', '/messages', people[who], { ...place, body, mentions: [] })

beforeAll(async () => {
  database = await throwawayDatabase()
  // Keys in the environment would turn on the compatible API and its realtime, unless the config keeps them off.
  chat = await startChat(database.databaseUrl, { PROTOBASE_PUBLISHABLE_KEY: 'sb_publishable_chat_test_key', PROTOBASE_SECRET_KEY: 'sb_secret_chat_test_key' })
  const workspaces = await makeWorkspaces(database.databaseUrl, chat.url)
  people = { ana: await workspaces.as(ana), ben: await workspaces.as(ben), dan: await workspaces.as(dan), superuser: await workspaces.as(superuser) }
  ids = workspaces.ids
}, 180_000)

afterAll(async () => {
  await chat?.stop()
  await database?.drop()
})

describe('a private channel', () => {
  let plans: { id: number }
  let said: { id: number }

  beforeAll(async () => {
    plans = await created(await send('POST', '/channels', people.ana, { name: 'plans', kind: 'private', member_ids: [ids.ben] }))
    said = await created(await message('ben', { channel_id: plans.id }, 'Only for us'))
  })

  it('has its creator as a member, though they did not pick themselves', async () => {
    const channel = await (await api(`/channels/${plans.id}`, people.ana)).json()
    expect(new Set(channel.member_ids)).toEqual(new Set([ids.ana, ids.ben]))
  })

  it('is neither listed nor read by someone outside it, as if it did not exist', async () => {
    expect((await listed('/channels', 'dan')).map((channel) => channel.id)).not.toContain(plans.id)
    expect((await listed('/channels', 'ben')).map((channel) => channel.id)).toContain(plans.id)
    const unknown = await api('/channels/999999', people.dan)
    const hidden = await api(`/channels/${plans.id}`, people.dan)
    expect(hidden.status).toBe(404)
    expect(await hidden.json()).toMatchObject({ status: unknown.status, title: (await unknown.json()).title })
  })

  it('keeps its messages from someone outside it, and their posts out', async () => {
    expect(await listed('/messages', 'dan', `channel_id = ${plans.id}`)).toEqual([])
    expect((await listed('/messages', 'dan')).map((each) => each.id)).not.toContain(said.id)
    expect((await api(`/messages/${said.id}`, people.dan)).status).toBe(404)
    expect((await message('dan', { channel_id: plans.id }, 'Let me in')).status).toBe(403)
    expect((await listed('/messages', 'ana', `channel_id = ${plans.id}`)).map((each) => each.id)).toEqual([said.id])
  })

  it('takes members only from its creator, and never turns public', async () => {
    expect([403, 404]).toContain((await change(`/channels/${plans.id}`, 'ben', { member_ids: [ids.ana, ids.ben, ids.dan] })).status)
    expect((await change(`/channels/${plans.id}`, 'ana', { kind: 'public', member_ids: null })).status).toBe(400)
    expect((await api(`/channels/${plans.id}`, people.dan)).status).toBe(404)
  })

  it('keeps its creator in it', async () => {
    const answer = await change(`/channels/${plans.id}`, 'ana', { member_ids: [ids.ben] })
    expect(answer.status).toBeGreaterThanOrEqual(400)
    expect(answer.status).toBeLessThan(500)
  })

  it('is read by someone its creator adds, and no longer once they are taken off', async () => {
    expect((await change(`/channels/${plans.id}`, 'ana', { member_ids: [ids.ana, ids.ben, ids.dan] })).status).toBe(200)
    expect((await api(`/messages/${said.id}`, people.dan)).status).toBe(200)

    expect((await change(`/channels/${plans.id}`, 'ana', { member_ids: [ids.ana, ids.dan] })).status).toBe(200)
    expect((await api(`/channels/${plans.id}`, people.ben)).status).toBe(404)
    expect(await listed('/messages', 'ben', `channel_id = ${plans.id}`)).toEqual([])
    expect((await api(`/messages/${said.id}`, people.ben)).status).toBe(404)
    expect((await message('ben', { channel_id: plans.id }, 'Still here?')).status).toBe(403)
  })

  it('is out of the superuser’s reach too, who gets what a key that does not exist gets', async () => {
    expect((await listed('/channels', 'superuser')).map((channel) => channel.id)).not.toContain(plans.id)
    expect(await listed('/messages', 'superuser', `channel_id = ${plans.id}`)).toEqual([])
    // The change is sent with the ETag its creator reads, so only the access rules can refuse it.
    const answers = async (path: string) => ({
      read: (await api(path, people.superuser)).status,
      changed: (await change(path, 'superuser', { member_ids: [ids.ana, ids.dan] }, 'ana')).status,
      deleted: (await api(path, people.superuser, { method: 'DELETE' })).status,
    })
    expect(await answers(`/channels/${plans.id}`)).toEqual(await answers('/channels/999999'))
    expect((await answers('/channels/999999')).read).toBe(404)
    expect((await api(`/channels/${plans.id}`, people.ana)).status).toBe(200)
  })

  it('does not keep its name from a public channel, so a refused name tells nothing', async () => {
    expect((await send('POST', '/channels', people.ben, { name: 'plans' })).status).toBe(201)
  })
})

describe('a public channel', () => {
  it('has no member list', async () => {
    expect((await send('POST', '/channels', people.ana, { name: 'open', member_ids: [ids.ben] })).status).toBe(400)
  })
})

describe('a direct message', () => {
  let conversation: { id: number; member_ids: string[] }
  let said: { id: number }

  beforeAll(async () => {
    conversation = await created(await send('POST', '/direct_messages', people.ana, { member_ids: [ids.ben] }))
    said = await created(await message('ben', { direct_message_id: conversation.id }, 'Lunch?'))
  })

  it('is between its starter and the people they picked', async () => {
    expect(new Set(conversation.member_ids)).toEqual(new Set([ids.ana, ids.ben]))
  })

  it('is one conversation for one set of people, which starting it again names to its people', async () => {
    for (const [who, members] of [['ana', [ids.ben]], ['ben', [ids.ana]], ['ana', [ids.ben, ids.ana, ids.ben]]] as const) {
      const answer = await send('POST', '/direct_messages', people[who], { member_ids: members })
      expect(answer.status).toBe(409)
      expect(String((await answer.json()).existing?.key)).toBe(String(conversation.id))
    }
    expect((await listed('/direct_messages', 'ana')).map((each) => each.id)).toEqual([conversation.id])
  })

  it('needs someone besides its starter', async () => {
    expect((await send('POST', '/direct_messages', people.dan, { member_ids: [] })).status).toBeGreaterThanOrEqual(400)
    expect((await send('POST', '/direct_messages', people.dan, { member_ids: [ids.dan] })).status).toBeGreaterThanOrEqual(400)
  })

  it('is neither listed nor read by someone outside it', async () => {
    expect(await listed('/direct_messages', 'dan')).toEqual([])
    expect((await api(`/direct_messages/${conversation.id}`, people.dan)).status).toBe(404)
    expect(await listed('/messages', 'dan', `direct_message_id = ${conversation.id}`)).toEqual([])
    expect((await api(`/messages/${said.id}`, people.dan)).status).toBe(404)
    expect((await message('dan', { direct_message_id: conversation.id }, 'Hi both')).status).toBe(403)
  })

  it('is read by its people', async () => {
    expect((await listed('/messages', 'ana', `direct_message_id = ${conversation.id}`)).map((each) => each.id)).toEqual([said.id])
  })

  it('never changes who it is between', async () => {
    expect([403, 404, 405]).toContain((await change(`/direct_messages/${conversation.id}`, 'ana', { member_ids: [ids.ben, ids.dan] })).status)
  })

  // After the cases that need Dan in no conversation: the starter is always in the set, so Dan's is never this one.
  it('is never named to someone outside it who picks its people, who gets a conversation of their own', async () => {
    const started = await created(await send('POST', '/direct_messages', people.dan, { member_ids: [ids.ana, ids.ben] }))
    expect(started.id).not.toBe(conversation.id)
    const again = await send('POST', '/direct_messages', people.dan, { member_ids: [ids.ben, ids.ana] })
    expect(again.status).toBe(409)
    const named = (await again.json()).existing?.key
    expect(String(named)).toBe(String(started.id))
    expect((await api(`/direct_messages/${named}`, people.dan)).status).toBe(200)
  })

  it('tells its people of a new message, which someone outside it cannot read', async () => {
    const bens = await followLive(chat.url, people.ben)
    const posted = await created(await message('ana', { direct_message_id: conversation.id }, 'Live?'))
    expect(await bens.changes((change) => change.resource === 'messages' && String(change.key) === String(posted.id), 10_000)).toBe(true)
    bens.stop()
    expect((await api(`/messages/${posted.id}`, people.dan)).status).toBe(404)
  }, 30_000)
})

describe('a message', () => {
  it('goes into one conversation', async () => {
    const general = await created(await send('POST', '/channels', people.ana, { name: 'general' }))
    const conversation = (await listed('/direct_messages', 'ana'))[0]!
    expect((await message('ana', { channel_id: general.id, direct_message_id: conversation.id }, 'Both')).status).toBe(400)
    expect((await message('ana', {}, 'Neither')).status).toBe(400)
  })
})

describe('the compatible API and its realtime', () => {
  it('are not served, though keys are set, so no private message is reached around the access rules', async () => {
    const headers = { ...people.dan, apikey: 'sb_publishable_chat_test_key' }
    expect((await fetch(`${chat.url}/api/sb/rest/v1/messages`, { headers })).status).toBe(404)
    expect((await fetch(`${chat.url}/api/sb/rest/v1/channels`, { headers })).status).toBe(404)
    const socket = await fetch(`${chat.url}/api/sb/realtime/v1/websocket?apikey=sb_publishable_chat_test_key&vsn=1.0.0`, { headers })
    expect(socket.status).toBe(404)
  })
})

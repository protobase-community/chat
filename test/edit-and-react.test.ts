import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startChat, throwawayDatabase } from './chat-server'
import { followLive } from './live-stream'
import { ana, ben, dan, makeWorkspaces, superuser } from './workspaces'

// Editing, deleting and reacting to messages as the running app enforces them, against Postgres: each person edits only
// their own messages and deletes only their own, but a moderator such as the superuser, reacts as themselves only where
// they read, and others hear of it live. Ana, Ben and Dan share Northwind; Dan is not in Ana and Ben's private channel.

type Headers = Record<string, string>
type Who = 'ana' | 'ben' | 'dan' | 'superuser'
let chat: Awaited<ReturnType<typeof startChat>>
let database: Awaited<ReturnType<typeof throwawayDatabase>>
let people: Record<Who, Headers>
let ids: Record<'ana' | 'ben' | 'dan', string>
let general: { id: number }
let plans: { id: number }

const api = (path: string, headers: Headers, init: RequestInit = {}) =>
  fetch(`${chat.url}/api/v1${path}`, { ...init, headers: { ...headers, 'content-type': 'application/json' } })
const send = (method: string, path: string, headers: Headers, body: unknown) => api(path, headers, { method, body: JSON.stringify(body) })
const created = async (answer: Response) => {
  if (answer.status !== 201) throw new Error(`A create answered ${answer.status}: ${await answer.text()}`)
  return answer.json()
}
const say = (who: Who, channel_id: number, body: string) => send('POST', '/messages', people[who], { channel_id, body, mentions: [] }).then(created)
const edit = (who: Who, id: number, body: unknown) => api(`/messages/${id}`, { ...people[who], 'if-match': '*' }, { method: 'PATCH', body: JSON.stringify(body) })
const remove = (who: Who, path: string) => api(path, { ...people[who], 'if-match': '*' }, { method: 'DELETE' })
const react = (who: Who, message_id: number, emoji: string, extra: Record<string, unknown> = {}) =>
  send('POST', '/reactions', people[who], { message_id, emoji, ...extra })
const reactionsOf = async (who: Who, messageId: number) => {
  const answer = await api(`/reactions?filter=${encodeURIComponent(`message_id = ${messageId}`)}`, people[who])
  expect(answer.status).toBe(200)
  return (await answer.json()).items as { id: number; user_id: string; emoji: string }[]
}

beforeAll(async () => {
  database = await throwawayDatabase()
  chat = await startChat(database.databaseUrl)
  const workspaces = await makeWorkspaces(database.databaseUrl, chat.url)
  people = { ana: await workspaces.as(ana), ben: await workspaces.as(ben), dan: await workspaces.as(dan), superuser: await workspaces.as(superuser) }
  ids = workspaces.ids
  general = await created(await send('POST', '/channels', people.ana, { name: 'general' }))
  plans = await created(await send('POST', '/channels', people.ana, { name: 'plans', kind: 'private', member_ids: [ids.ben] }))
}, 180_000)

afterAll(async () => {
  await chat?.stop()
  await database?.drop()
})

describe('editing a message', () => {
  it('changes its author’s own message and marks it edited, which the others hear of live', async () => {
    const message = await say('ana', general.id, 'Helo all')
    expect(message.edited_at).toBeNull()
    const live = await followLive(chat.url, people.ben)
    const edited = await edit('ana', message.id, { body: 'Hello all' })
    expect(edited.status).toBe(200)
    expect(await live.changes((change) => change.resource === 'messages' && String(change.key) === String(message.id) && change.operation === 'update', 10_000)).toBe(true)
    live.stop()
    const read = await (await api(`/messages/${message.id}`, people.ben)).json()
    expect(read).toMatchObject({ body: 'Hello all' })
    expect(read.edited_at).not.toBeNull()
  })

  it('is refused for anyone else’s message, the superuser’s too', async () => {
    const message = await say('ana', general.id, 'Mine')
    for (const who of ['ben', 'superuser'] as const) expect((await edit(who, message.id, { body: 'Theirs' })).status).toBe(404)
    expect((await (await api(`/messages/${message.id}`, people.ana)).json()).body).toBe('Mine')
  })

  it('keeps a message in its conversation', async () => {
    const message = await say('ana', general.id, 'Stays here')
    expect((await edit('ana', message.id, { channel_id: plans.id })).status).toBe(400)
  })
})

describe('deleting a message', () => {
  it('is refused for anyone else’s message, but to a moderator such as the superuser', async () => {
    const message = await say('ana', general.id, 'Keep this')
    for (const who of ['ben', 'dan'] as const) expect((await remove(who, `/messages/${message.id}`)).status).toBe(404)
    expect((await api(`/messages/${message.id}`, people.ana)).status).toBe(200)
    expect((await remove('superuser', `/messages/${message.id}`)).status).toBe(204)
  })

  it('takes its author’s own message and its reactions away, which the others hear of live', async () => {
    const message = await say('ana', general.id, 'Wrong channel')
    await created(await react('ben', message.id, 'thumbs_up'))
    const live = await followLive(chat.url, people.ben)
    expect((await remove('ana', `/messages/${message.id}`)).status).toBe(204)
    expect(await live.changes((change) => change.resource === 'messages' && String(change.key) === String(message.id) && change.operation === 'delete', 10_000)).toBe(true)
    live.stop()
    expect((await api(`/messages/${message.id}`, people.ben)).status).toBe(404)
    expect(await reactionsOf('ben', message.id)).toEqual([])
  })
})

describe('a reaction', () => {
  it('is its reactor’s, whoever they say it is of, and others hear of it live', async () => {
    const message = await say('ana', general.id, 'Lunch at noon?')
    const live = await followLive(chat.url, people.ana)
    const reaction = await created(await react('ben', message.id, 'heart'))
    expect(reaction.user_id).toBe(ids.ben)
    expect(await live.changes((change) => change.resource === 'reactions' && String(change.key) === String(reaction.id) && change.operation === 'create', 10_000)).toBe(true)
    live.stop()
    expect((await react('ben', message.id, 'laugh', { user_id: ids.ana })).status).toBe(400)
    expect(await reactionsOf('ana', message.id)).toMatchObject([{ user_id: ids.ben, emoji: 'heart' }])
  })

  it('is one per person, message and emoji', async () => {
    const message = await say('ana', general.id, 'Ship it')
    await created(await react('ben', message.id, 'party'))
    expect((await react('ben', message.id, 'party')).status).toBe(409)
    await created(await react('ana', message.id, 'party'))
    await created(await react('ben', message.id, 'thumbs_up'))
    expect(await reactionsOf('dan', message.id)).toHaveLength(3)
  })

  it('takes only an emoji of the set', async () => {
    const message = await say('ana', general.id, 'Pick one')
    expect((await react('ben', message.id, 'rocket')).status).toBe(400)
  })

  it('is taken back only by its reactor, the superuser not either, and never changed', async () => {
    const message = await say('ana', general.id, 'Mine to react to')
    const reaction = await created(await react('ben', message.id, 'sad'))
    expect((await api(`/reactions/${reaction.id}`, { ...people.ben, 'if-match': '*' }, { method: 'PATCH', body: JSON.stringify({ emoji: 'heart' }) })).status).not.toBe(200)
    for (const who of ['ana', 'superuser'] as const) expect((await remove(who, `/reactions/${reaction.id}`)).status).toBe(404)
    expect((await remove('ben', `/reactions/${reaction.id}`)).status).toBe(204)
    expect(await reactionsOf('ana', message.id)).toEqual([])
  })

  it('stays with a private channel’s members: refused and unseen outside it', async () => {
    const message = await say('ben', plans.id, 'Just us')
    await created(await react('ana', message.id, 'thumbs_up'))
    expect((await react('dan', message.id, 'thumbs_up')).status).toBe(403)
    expect(await reactionsOf('dan', message.id)).toEqual([])
    expect(await reactionsOf('ben', message.id)).toHaveLength(1)
  })
})

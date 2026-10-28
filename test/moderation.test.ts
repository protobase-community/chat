import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startChat, throwawayDatabase } from './chat-server'
import { ana, ben, dan, eve, makeWorkspaces } from './workspaces'

// Moderating messages as the running app enforces it, against Postgres: Eve, Northwind's admin with the Moderator role,
// deletes anyone's message in a conversation she reads, files included, and edits none; a participant deletes only their
// own. Ben and Dan share a private channel Eve is not in.

type Headers = Record<string, string>
type Who = 'ana' | 'ben' | 'dan' | 'eve'
let chat: Awaited<ReturnType<typeof startChat>>
let database: Awaited<ReturnType<typeof throwawayDatabase>>
let people: Record<Who, Headers>
let ids: Record<Who, string>
let general: { id: number }
let backroom: { id: number }

const api = (path: string, headers: Headers, init: RequestInit = {}) =>
  fetch(`${chat.url}/api/v1${path}`, { ...init, headers: { ...headers, 'content-type': 'application/json' } })
const created = async (answer: Response) => {
  if (answer.status !== 201) throw new Error(`A create answered ${answer.status}: ${await answer.text()}`)
  return (await answer.json()) as { id: number }
}
const start = (who: Who, path: string, body: unknown) => api(path, people[who], { method: 'POST', body: JSON.stringify(body) }).then(created)
const say = (who: Who, channel_id: number, body: string) => start(who, '/messages', { channel_id, body, mentions: [] })
const batch = (who: Who, ops: unknown[]) => api(':batchWrite', people[who], { method: 'POST', body: JSON.stringify({ ops }) })
const remove = (who: Who, id: number) => api(`/messages/${id}`, { ...people[who], 'if-match': '*' }, { method: 'DELETE' })

beforeAll(async () => {
  database = await throwawayDatabase()
  chat = await startChat(database.databaseUrl)
  const workspaces = await makeWorkspaces(database.databaseUrl, chat.url)
  people = { ana: await workspaces.as(ana), ben: await workspaces.as(ben), dan: await workspaces.as(dan), eve: await workspaces.as(eve) }
  ids = workspaces.ids
  general = await start('ana', '/channels', { name: 'general' })
  backroom = await start('ben', '/channels', { name: 'backroom', kind: 'private', member_ids: [ids.dan] })
}, 180_000)

afterAll(async () => {
  await chat?.stop()
  await database?.drop()
})

describe('a moderator', () => {
  it('deletes a member’s message in a public channel, which a member cannot', async () => {
    const message = await say('ben', general.id, 'Off topic')
    expect((await remove('dan', message.id)).status).toBe(404)
    expect((await remove('eve', message.id)).status).toBe(204)
    expect((await api(`/messages/${message.id}`, people.ben)).status).toBe(404)
  })

  it('never edits a member’s message', async () => {
    const message = await say('ben', general.id, 'As I wrote it')
    const edit = await api(`/messages/${message.id}`, { ...people.eve, 'if-match': '*' }, { method: 'PATCH', body: JSON.stringify({ body: 'As Eve would' }) })
    expect(edit.status).toBe(404)
    expect((await (await api(`/messages/${message.id}`, people.ben)).json()).body).toBe('As I wrote it')
  })

  it('cannot delete a message of a private channel she is not in', async () => {
    const message = await say('ben', backroom.id, 'Between us')
    expect((await remove('eve', message.id)).status).toBe(403)
    expect((await api(`/messages/${message.id}`, people.dan)).status).toBe(200)
  })

  it('deletes a member’s message with its files, as the chat does in one write', async () => {
    const uploaded = await fetch(`${chat.url}/api/v1/attachments:upload?field=file&name=notes.txt`, { method: 'POST', headers: people.ben, body: Buffer.from('notes') })
    const file = (await uploaded.json()).value as string
    const sent = await batch('ben', [
      { op: 'create', resource: 'messages', ref: 'message', data: { channel_id: general.id, body: 'See the file', mentions: [] } },
      { op: 'create', resource: 'attachments', ref: 'file', data: { message_id: { $ref: 'message' }, file } },
    ])
    expect(sent.status).toBe(200)
    const [message, attachment] = (await sent.json()).results.map((result: { record: { id: number } }) => result.record.id) as number[]
    const removed = await batch('eve', [
      { op: 'delete', resource: 'attachments', key: attachment },
      { op: 'delete', resource: 'messages', key: message },
    ])
    expect(removed.status).toBe(200)
    expect((await api(`/messages/${message}`, people.ben)).status).toBe(404)
  })
})

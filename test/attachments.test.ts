import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { maxFileBytes } from '../config/attachments/limits'
import { startChat, throwawayDatabase } from './chat-server'
import { ana, ben, dan, makeWorkspaces } from './workspaces'

// Files shared in messages as the running app enforces them, against Postgres: a message's author shares files in it,
// with or without text, its readers list and download them, and nobody outside a private channel does. Ana, Ben and Dan
// share Northwind; Dan is not in Ana and Ben's private channel.

type Headers = Record<string, string>
type Who = 'ana' | 'ben' | 'dan'
type Attachment = { id: number; message_id: number; width: number | null; height: number | null; file: { uri: string; name: string; type: string; size: number; url: string } }
let chat: Awaited<ReturnType<typeof startChat>>
let database: Awaited<ReturnType<typeof throwawayDatabase>>
let people: Record<Who, Headers>
let general: { id: number }
let plans: { id: number }

// A PNG of 2 by 1 pixels and a PDF of one empty page.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADUlEQVR4nGP4zwAE/wEHAAH/4iOeWQAAAABJRU5ErkJggg==', 'base64')
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 10 10]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

const api = (path: string, headers: Headers, init: RequestInit = {}) =>
  fetch(`${chat.url}/api/v1${path}`, { ...init, headers: { ...headers, 'content-type': 'application/json' } })
const batch = (who: Who, ops: unknown[]) => api(':batchWrite', people[who], { method: 'POST', body: JSON.stringify({ ops }) })
const ok = async (answer: Response, status: number) => {
  if (answer.status !== status) throw new Error(`Answered ${answer.status}, not ${status}: ${await answer.text()}`)
  return answer.json()
}

/** Uploads `bytes` as `name` for an attachment's file, answering the ticket a write takes. */
const upload = (who: Who, name: string, bytes: Uint8Array<ArrayBuffer>) =>
  fetch(`${chat.url}/api/v1/attachments:upload?field=file&name=${encodeURIComponent(name)}`, { method: 'POST', headers: people[who], body: bytes })
const ticket = async (who: Who, name: string, bytes: Uint8Array<ArrayBuffer>) => (await ok(await upload(who, name, bytes), 201)).value as string

/** Sends a message of `body` (none when undefined) with the files of `tickets` in one batch, as the chat does. */
const post = (who: Who, channel_id: number, body: string | undefined, tickets: string[]) =>
  batch(who, [
    { op: 'create', resource: 'messages', ref: 'message', data: { channel_id, body, mentions: [] } },
    ...tickets.map((file) => ({ op: 'create', resource: 'attachments', data: { message_id: { $ref: 'message' }, file } })),
  ])
const sent = async (answer: Response) => Number((await ok(answer, 200)).results[0].record.id)

const attachmentsOf = async (who: Who, messageId: number) => {
  const answer = await api(`/attachments?filter=${encodeURIComponent(`message_id = ${messageId}`)}&order_by=id`, people[who])
  return (await ok(answer, 200)).items as Attachment[]
}

beforeAll(async () => {
  database = await throwawayDatabase()
  chat = await startChat(database.databaseUrl)
  const workspaces = await makeWorkspaces(database.databaseUrl, chat.url)
  people = { ana: await workspaces.as(ana), ben: await workspaces.as(ben), dan: await workspaces.as(dan) }
  general = await ok(await api('/channels', people.ana, { method: 'POST', body: JSON.stringify({ name: 'general' }) }), 201)
  plans = await ok(await api('/channels', people.ana, { method: 'POST', body: JSON.stringify({ name: 'plans', kind: 'private', member_ids: [workspaces.ids.ben] }) }), 201)
}, 180_000)

afterAll(async () => {
  await chat?.stop()
  await database?.drop()
})

describe('a message with files', () => {
  it('carries an image and a PDF its readers list and download', async () => {
    const id = await sent(await post('ana', general.id, 'The mockup and the brief', [await ticket('ana', 'mockup.png', png), await ticket('ana', 'brief.pdf', pdf)]))
    const [image, document] = await attachmentsOf('ben', id)
    expect(image).toMatchObject({ width: 2, height: 1, file: { name: 'mockup.png', type: 'image/png', size: png.length } })
    expect(document).toMatchObject({ width: null, height: null, file: { name: 'brief.pdf', type: 'application/pdf', size: pdf.length } })
    const download = await fetch(new URL(document!.file.url, chat.url))
    expect(download.status).toBe(200)
    expect(download.headers.get('content-type')).toBe('application/pdf')
    expect(Buffer.from(await download.arrayBuffer())).toEqual(pdf)
  })

  it('is sent without text, its body null', async () => {
    const id = await sent(await post('ana', general.id, undefined, [await ticket('ana', 'photo.png', png)]))
    expect((await ok(await api(`/messages/${id}`, people.ben), 200)).body).toBeNull()
    expect(await attachmentsOf('ben', id)).toHaveLength(1)
  })

  it('is refused with neither text nor files', async () => {
    expect((await post('ana', general.id, undefined, [])).status).toBe(400)
  })

  it('takes files only from the message’s author', async () => {
    const id = await sent(await post('ana', general.id, 'Mine', []))
    const answer = await api('/attachments', people.ben, { method: 'POST', body: JSON.stringify({ message_id: id, file: await ticket('ben', 'theirs.png', png) }) })
    expect(answer.status).toBe(409)
    expect(await attachmentsOf('ana', id)).toEqual([])
  })

  it('takes only a ticket of an upload, never a stored file’s URI', async () => {
    const id = await sent(await post('ana', general.id, 'Copy', []))
    const [stored] = await attachmentsOf('ana', await sent(await post('ana', general.id, undefined, [await ticket('ana', 'a.png', png)])))
    const answer = await api('/attachments', people.ana, { method: 'POST', body: JSON.stringify({ message_id: id, file: stored!.file.uri }) })
    expect(answer.status).toBe(400)
  })
})

describe('an upload', () => {
  it('above the size limit is refused before anything is stored', async () => {
    const answer = await upload('ana', 'huge.bin', new Uint8Array(maxFileBytes + 1))
    expect(answer.status).toBe(413)
  })
})

describe('deleting a message with files', () => {
  it('goes with its files, deleted first in one batch', async () => {
    const id = await sent(await post('ana', general.id, undefined, [await ticket('ana', 'gone.png', png)]))
    const [attachment] = await attachmentsOf('ana', id)
    expect((await api(`/messages/${id}`, { ...people.ana, 'if-match': '*' }, { method: 'DELETE' })).status).toBe(409)
    expect((await api(`/attachments/${attachment!.id}`, { ...people.ana, 'if-match': '*' }, { method: 'DELETE' })).status).toBe(400)
    await ok(await batch('ana', [{ op: 'delete', resource: 'attachments', key: attachment!.id }, { op: 'delete', resource: 'messages', key: id }]), 200)
    expect((await api(`/messages/${id}`, people.ana)).status).toBe(404)
    expect(await attachmentsOf('ana', id)).toEqual([])
  })
})

describe('a private channel’s files', () => {
  it('stay with its members: unlisted, unread and undownloadable outside it', async () => {
    const id = await sent(await post('ben', plans.id, 'Just us', [await ticket('ben', 'secret.pdf', pdf)]))
    const [attachment] = await attachmentsOf('ana', id)
    expect(attachment).toBeDefined()
    expect(await attachmentsOf('dan', id)).toEqual([])
    expect((await api(`/attachments/${attachment!.id}`, people.dan)).status).toBe(404)
    const unsigned = new URL(attachment!.file.url, chat.url)
    unsigned.search = ''
    expect((await fetch(unsigned, { headers: people.dan })).status).toBeGreaterThanOrEqual(400)
    expect((await post('dan', plans.id, undefined, [await ticket('dan', 'mine.pdf', pdf)])).status).toBe(403)
  })
})

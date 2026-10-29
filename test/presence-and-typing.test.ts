import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { openChannels } from './channel-socket'
import { startChat, throwawayDatabase } from './chat-server'
import { ana, ben, cara, dan, makeWorkspaces } from './workspaces'

// The record channels the chat's presence and typing go over, as the running app enforces them, against Postgres: a
// workspace's record carries its members' presence, and a conversation's record its typing, each for those who read
// the record alone. Ana, Ben and Dan share Northwind; Dan is not in Ana and Ben's private channel; Cara is in Southwind.

type Headers = Record<string, string>
type Who = 'ana' | 'ben' | 'cara' | 'dan'
let chat: Awaited<ReturnType<typeof startChat>>
let database: Awaited<ReturnType<typeof throwawayDatabase>>
let people: Record<Who, Headers>
let ids: Record<Who, string>

const api = (path: string, who: Who, init: RequestInit = {}) =>
  fetch(`${chat.url}/api/v1${path}`, { ...init, headers: { ...people[who], 'content-type': 'application/json' } })
const created = async (answer: Response) => {
  if (answer.status !== 201) throw new Error(`A create answered ${answer.status}: ${await answer.text()}`)
  return (await answer.json()) as Record<string, unknown>
}
const notFound = { ok: false, error: { code: 'not-found' } }

beforeAll(async () => {
  database = await throwawayDatabase()
  chat = await startChat(database.databaseUrl)
  const workspaces = await makeWorkspaces(database.databaseUrl, chat.url)
  people = { ana: await workspaces.as(ana), ben: await workspaces.as(ben), cara: await workspaces.as(cara), dan: await workspaces.as(dan) }
  ids = workspaces.ids
}, 180_000)

afterAll(async () => {
  await chat?.stop()
  await database?.drop()
})

describe("a workspace's record", () => {
  it('is added once, by the first member, and read by every member as their own workspace', async () => {
    expect((await (await api('/workspaces', 'ana')).json()).items).toEqual([])
    const northwind = await created(await api('/workspaces', 'ana', { method: 'POST', body: '{}' }))
    expect((await api('/workspaces', 'ben', { method: 'POST', body: '{}' })).status).toBe(409)
    expect((await (await api('/workspaces', 'ben')).json()).items).toMatchObject([{ organization_id: northwind.organization_id }])
    expect((await (await api('/workspaces', 'cara')).json()).items).toEqual([])
  })

  it("carries its members' presence, and nothing of it to another workspace", async () => {
    const [northwind] = (await (await api('/workspaces', 'ana')).json()).items
    const anaSocket = await openChannels(chat.url, people.ana)
    const benSocket = await openChannels(chat.url, people.ben)
    const caraSocket = await openChannels(chat.url, people.cara)
    try {
      const joined = await anaSocket.join('workspaces', northwind.organization_id)
      expect(joined).toMatchObject({ ok: true })
      expect(await benSocket.join('workspaces', northwind.organization_id)).toMatchObject({ ok: true })
      expect(await caraSocket.join('workspaces', northwind.organization_id)).toMatchObject(notFound)

      await anaSocket.track(String(joined!.channel), { activity: 'online' })
      const seen = await benSocket.frame((frame) => frame.type === 'presence_diff' && JSON.stringify(frame.joins).includes(ids.ana))
      expect(seen).toMatchObject({ joins: [{ user: ids.ana, state: { activity: 'online' } }] })
      expect(caraSocket.frames.filter((frame) => frame.type !== 'reply')).toEqual([])
    } finally {
      for (const socket of [anaSocket, benSocket, caraSocket]) socket.close()
    }
  })
})

describe("a conversation's typing", () => {
  it('reaches the members of a private channel, and someone outside it can neither join nor hear it', async () => {
    const plans = await created(await api('/channels', 'ana', { method: 'POST', body: JSON.stringify({ name: 'plans', kind: 'private', member_ids: [ids.ben] }) }))
    const anaSocket = await openChannels(chat.url, people.ana)
    const benSocket = await openChannels(chat.url, people.ben)
    const danSocket = await openChannels(chat.url, people.dan)
    try {
      const joined = await anaSocket.join('channels', plans.id as number)
      expect(joined).toMatchObject({ ok: true })
      expect(await benSocket.join('channels', plans.id as number)).toMatchObject({ ok: true })
      expect(await danSocket.join('channels', plans.id as number)).toMatchObject(notFound)
      // A channel Dan was refused takes nothing he sends either.
      expect(await danSocket.send(String(joined!.channel), 'typing', { typing: true, thread: null })).toMatchObject({ ok: false })

      expect(await anaSocket.send(String(joined!.channel), 'typing', { typing: true, thread: null })).toMatchObject({ ok: true })
      expect(await benSocket.frame((frame) => frame.type === 'broadcast')).toMatchObject({ event: 'typing', user: ids.ana, payload: { typing: true, thread: null } })
      const overHttp = await fetch(`${chat.url}/api/channels/channels/${plans.id}/broadcast`, {
        method: 'POST',
        headers: { ...people.dan, 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'typing', payload: { typing: true, thread: null } }),
      })
      expect(overHttp.status).toBe(404)
      expect(danSocket.frames.filter((frame) => frame.type === 'broadcast' || frame.type === 'presence' || frame.type === 'presence_diff')).toEqual([])
    } finally {
      for (const socket of [anaSocket, benSocket, danSocket]) socket.close()
    }
  })

  it("of a direct message reaches none but its people", async () => {
    const between = await created(await api('/direct_messages', 'ben', { method: 'POST', body: JSON.stringify({ member_ids: [ids.ana] }) }))
    const danSocket = await openChannels(chat.url, people.dan)
    try {
      expect(await danSocket.join('direct_messages', between.id as number)).toMatchObject(notFound)
    } finally {
      danSocket.close()
    }
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { callUrl } from '../config/conversations/call-address'
import { upgradeStatus } from './call-upgrade'
import { startChat, throwawayDatabase } from './chat-server'
import { ana, ben, dan, makeWorkspaces } from './workspaces'

// Who joins a conversation's call, as the running app decides it against Postgres: functions/call.ts admits only
// someone who reads the conversation. Ana and Ben share a private channel and a direct message; Dan, in the same
// workspace, is in neither.

type Headers = Record<string, string>
let chat: Awaited<ReturnType<typeof startChat>>
let database: Awaited<ReturnType<typeof throwawayDatabase>>
let people: Record<'ana' | 'ben' | 'dan', Headers>
let plans: { id: number }
let general: { id: number }
let direct: { id: number }

const create = async (path: string, headers: Headers, body: unknown) => {
  const answer = await fetch(`${chat.url}/api/v1${path}`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (answer.status !== 201) throw new Error(`A create answered ${answer.status}: ${await answer.text()}`)
  return answer.json()
}
const joinStatus = (resource: string, key: number | string, headers: Headers) => upgradeStatus(`${chat.url}${callUrl(resource, String(key))}`, headers)

beforeAll(async () => {
  database = await throwawayDatabase()
  chat = await startChat(database.databaseUrl)
  const workspaces = await makeWorkspaces(database.databaseUrl, chat.url)
  people = { ana: await workspaces.as(ana), ben: await workspaces.as(ben), dan: await workspaces.as(dan) }
  plans = await create('/channels', people.ana, { name: 'plans', kind: 'private', member_ids: [workspaces.ids.ben] })
  general = await create('/channels', people.ana, { name: 'general' })
  direct = await create('/direct_messages', people.ana, { member_ids: [workspaces.ids.ben] })
}, 180_000)

afterAll(async () => {
  await chat?.stop()
  await database?.drop()
})

describe("a conversation's call", () => {
  it('lets a private channel’s members join, and refuses someone outside it as if it did not exist', async () => {
    expect(await joinStatus('channels', plans.id, people.ana)).toBe(101)
    expect(await joinStatus('channels', plans.id, people.ben)).toBe(101)
    expect(await joinStatus('channels', plans.id, people.dan)).toBe(404)
    expect(await joinStatus('channels', 999_999, people.dan)).toBe(404)
  })

  it('lets everyone in the workspace join a public channel’s call', async () => {
    expect(await joinStatus('channels', general.id, people.dan)).toBe(101)
  })

  it('refuses someone outside a direct message', async () => {
    expect(await joinStatus('direct_messages', direct.id, people.ben)).toBe(101)
    expect(await joinStatus('direct_messages', direct.id, people.dan)).toBe(404)
  })

  it('refuses a resource without calls, and anyone not signed in', async () => {
    expect(await joinStatus('messages', 1, people.ana)).toBe(404)
    expect(await joinStatus('channels', plans.id, {})).toBe(401)
  })
})

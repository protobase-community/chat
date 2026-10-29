import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startChat, throwawayDatabase } from './chat-server'
import { ana, ben, cara, dan, makeWorkspaces } from './workspaces'

// Notifications of mentions and direct messages as the running app sends them, against Postgres: a new message tells
// the people it mentions and a direct message's other members, in their bell, never its author and only those who may
// read it. Ana, Ben and Dan share Northwind; Dan is not in Ana and Ben's private channel; Cara is in Southwind.

type Headers = Record<string, string>
type Who = 'ana' | 'ben' | 'cara' | 'dan'
type Notification = { title: string; body: string | null; url: string | null }
let chat: Awaited<ReturnType<typeof startChat>>
let database: Awaited<ReturnType<typeof throwawayDatabase>>
let people: Record<Who, Headers>
let ids: Record<Who, string>
let general: { id: number }

const api = (path: string, headers: Headers, init: RequestInit = {}) =>
  fetch(`${chat.url}/api/v1${path}`, { ...init, headers: { ...headers, 'content-type': 'application/json' } })
const created = async (answer: Response) => {
  if (answer.status !== 201) throw new Error(`A create answered ${answer.status}: ${await answer.text()}`)
  return (await answer.json()) as { id: number }
}
const start = (who: Who, path: string, body: unknown) => api(path, people[who], { method: 'POST', body: JSON.stringify(body) }).then(created)
const say = (who: Who, place: Record<string, number>, body: string, mentions: string[] = []) => start(who, '/messages', { ...place, body, mentions })

/** `who`'s notifications, newest first, as the bell reads them. */
const inbox = async (who: Who) => {
  const answer = await fetch(`${chat.url}/api/notifications/history`, { headers: people[who] })
  expect(answer.status).toBe(200)
  return ((await answer.json()) as { items: Notification[] }).items
}
/** `who`'s notification of the message `body`, once it arrives, within 10 seconds. */
const arrived = async (who: Who, body: string) => {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    const found = (await inbox(who)).find((item) => item.body === body)
    if (found) return found
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`${who} got no notification of "${body}"`)
}
/** Whether `who` was told of `body`, asked once a later message to them, `probe`, has reached them. */
const told = async (who: Who, body: string, probe: string) => {
  await arrived(who, probe)
  return (await inbox(who)).some((item) => item.body === body)
}

beforeAll(async () => {
  database = await throwawayDatabase()
  chat = await startChat(database.databaseUrl)
  const workspaces = await makeWorkspaces(database.databaseUrl, chat.url)
  people = { ana: await workspaces.as(ana), ben: await workspaces.as(ben), cara: await workspaces.as(cara), dan: await workspaces.as(dan) }
  ids = workspaces.ids
  general = await start('ana', '/channels', { name: 'general' })
}, 180_000)

afterAll(async () => {
  await chat?.stop()
  await database?.drop()
})

describe('a mention', () => {
  it('tells both people a message mentions, naming its sender and channel, and not its author', async () => {
    const body = 'Standup moves to ten, @Ben Adeyemi @Dan Mwangi'
    await say('ana', { channel_id: general.id }, body, [ids.ben, ids.dan, ids.ana])
    for (const who of ['ben', 'dan'] as const) {
      expect(await arrived(who, body)).toMatchObject({ title: 'Ana Silva mentioned you in #general', url: `${chat.url}/channels/${general.id}` })
    }
    await say('ben', { channel_id: general.id }, 'Noted, @Ana Silva', [ids.ana])
    expect(await told('ana', body, 'Noted, @Ana Silva')).toBe(false)
  })

  it('opens the conversation for its recipient', async () => {
    const body = 'Have a look, @Ben Adeyemi'
    await say('ana', { channel_id: general.id }, body, [ids.ben])
    const { url } = await arrived('ben', body)
    const answer = await api(new URL(url!).pathname, people.ben)
    expect(answer.status).toBe(200)
    expect(await answer.json()).toMatchObject({ id: general.id, name: 'general' })
  })

  it('of someone outside a private channel tells no one', async () => {
    const plans = await start('ana', '/channels', { name: 'plans', kind: 'private', member_ids: [ids.ben] })
    const body = 'Should we ask @Dan Mwangi?'
    await say('ana', { channel_id: plans.id }, body, [ids.dan])
    await say('ana', { channel_id: general.id }, 'Ping, @Dan Mwangi', [ids.dan])
    expect(await told('dan', body, 'Ping, @Dan Mwangi')).toBe(false)
  })

  it('in a reply tells the person it mentions, naming the thread', async () => {
    const thread = await say('ben', { channel_id: general.id }, 'Who has the keys?')
    const body = 'I think @Dan Mwangi has them'
    await say('ana', { channel_id: general.id, thread_id: thread.id }, body, [ids.dan])
    expect(await arrived('dan', body)).toMatchObject({ title: 'Ana Silva mentioned you in a thread in #general', url: `${chat.url}/channels/${general.id}` })
  })

  it('of someone of another workspace tells no one', async () => {
    await say('ana', { channel_id: general.id }, 'Hello, Cara', [ids.cara])
    // Messages are dispatched in order, so once a later one reached Ben, Cara's turn has passed.
    await say('ana', { channel_id: general.id }, 'Hello, @Ben Adeyemi', [ids.ben])
    await arrived('ben', 'Hello, @Ben Adeyemi')
    expect(await inbox('cara')).toEqual([])
  })
})

describe('a direct message', () => {
  it('tells its other members only', async () => {
    const between = await start('ben', '/direct_messages', { member_ids: [ids.ana] })
    const body = 'Lunch at noon?'
    await say('ben', { direct_message_id: between.id }, body, [ids.dan])
    expect(await arrived('ana', body)).toMatchObject({ title: 'Ben Adeyemi sent you a direct message', url: `${chat.url}/direct_messages/${between.id}` })
    await say('ana', { direct_message_id: between.id }, 'Sure')
    expect(await told('ben', body, 'Sure')).toBe(false)
    await say('ana', { channel_id: general.id }, 'And you, @Dan Mwangi?', [ids.dan])
    expect(await told('dan', body, 'And you, @Dan Mwangi?')).toBe(false)
  })
})

describe('do not disturb', () => {
  it('keeps a mention in the history the bell lists', async () => {
    const quiet = await fetch(`${chat.url}/api/status`, {
      method: 'PUT',
      headers: { ...people.ana, 'content-type': 'application/json' },
      body: JSON.stringify({ availability: 'do_not_disturb', text: null, clearsAt: null }),
    })
    expect(quiet.status).toBe(200)
    const body = 'Are you around, @Ana Silva?'
    await say('ben', { channel_id: general.id }, body, [ids.ana])
    expect(await arrived('ana', body)).toMatchObject({ title: 'Ben Adeyemi mentioned you in #general' })
  })
})

import { randomBytes } from 'node:crypto'
import type postgres from 'postgres'
import { addMember, createOrganization, createUser, hasUsers, listOrganizations, listUsers, type AdminAuth } from '@protobase/server'
import { channels, directMessages, messages, owner, people, sentAt, workspace, type DemoChannel, type DemoMessage, type Person } from './demo-data'

/**
 * Writes the demo workspace, leaving what is there already as it is, so it runs again without doubling anything: a
 * person, the workspace, a membership, a channel or a direct message that exists is kept, and one that has messages
 * gets none.
 * The developer's own account, the store's first, joins it as its admin. Answers the passwords of the people it created, which nobody can read again later.
 */
export const seedDemoWorkspace = async (auth: AdminAuth, sql: postgres.Sql, today: Date) => {
  // The store's first account is always a superuser: it is the developer's own, never a demo person's.
  if (!(await hasUsers(auth))) throw new Error('Create your own account first: bun run protobase users create you@example.com --role admin --generate-password')

  const created: { email: string; password: string }[] = []
  const known = new Set((await listUsers(auth)).map((user) => user.email))
  for (const person of Object.values(people)) {
    if (known.has(person.email)) continue
    const password = randomBytes(12).toString('base64url')
    await createUser(auth, { email: person.email, name: person.name, password })
    created.push({ email: person.email, password })
  }

  const existing = (await listOrganizations(auth)).find((organization) => organization.slug === workspace.slug)
  const organization = existing ?? (await createOrganization(auth, { ...workspace, owner: people[owner].email })).organization
  const members = new Set(existing?.members.map((member) => member.email) ?? [people[owner].email])
  for (const person of Object.values(people)) {
    if (!members.has(person.email)) await addMember(auth, { organization: workspace.slug, email: person.email, appRoles: ['participant'] })
  }

  // The developer joins too, as the workspace's admin, so their own account sees the members' names and can invite.
  const accounts = await listUsers(auth)
  const developer = accounts.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))[0]!
  if (!members.has(developer.email)) {
    await addMember(auth, { organization: workspace.slug, email: developer.email, role: 'admin', appRoles: ['participant'] })
  }

  const users = new Map(accounts.map((user) => [user.email, user.id]))
  const userId = (person: Person) => users.get(people[person].email)!

  await sql.begin(async (tx) => {
    // A conversation gets its messages only while it has none, so a second run adds none.
    const post = async (column: 'channel_id' | 'direct_message_id', id: number, place: DemoMessage[]) => {
      const [found] = await tx<{ said: boolean }[]>`select exists (select from public.messages where ${tx(column)} = ${id}) as said`
      if (found!.said) return
      for (const message of place) {
        await tx`
          insert into public.messages (organization_id, ${tx(column)}, author_id, body, mentions, sent_at)
          values (${organization.id}, ${id}, ${userId(message.author)}, ${message.body},
            ${tx.json((message.mentions ?? []).map(userId))}, ${sentAt(message, today)})`
      }
    }

    // A private channel's members are Maya's pick; the database adds Maya, its creator, as it does for the app.
    for (const channel of channels as readonly DemoChannel[]) {
      const kind = channel.members ? 'private' : 'public'
      const members = channel.members ? tx.json(channel.members.map(userId)) : null
      const [found] = await tx<{ id: number }[]>`
        select id from public.channels where organization_id = ${organization.id} and name = ${channel.name} and kind = ${kind}`
      const [row] = found
        ? [found]
        : await tx<{ id: number }[]>`
            insert into public.channels (organization_id, name, topic, author_id, kind, member_ids)
            values (${organization.id}, ${channel.name}, ${channel.topic}, ${userId(owner)}, ${kind}, ${members})
            returning id`
      await post('channel_id', row!.id, messages.filter((message) => 'channel' in message && message.channel === channel.name))
    }

    for (const [key, members] of Object.entries(directMessages)) {
      const ids = tx.json(members.map(userId))
      const [found] = await tx<{ id: number }[]>`
        select id from public.direct_messages where organization_id = ${organization.id} and member_key = public.member_key(${ids})`
      const [row] = found
        ? [found]
        : await tx<{ id: number }[]>`
            insert into public.direct_messages (organization_id, member_ids, author_id)
            values (${organization.id}, ${ids}, ${userId(members[0])})
            returning id`
      await post('direct_message_id', row!.id, messages.filter((message) => 'directMessage' in message && message.directMessage === key))
    }
  })

  return created
}

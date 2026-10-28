import { randomBytes } from 'node:crypto'
import type postgres from 'postgres'
import { addMember, createOrganization, createUser, hasUsers, listOrganizations, listUsers, type AdminAuth } from '@protobase/server'
import { channels, messages, owner, people, sentAt, workspace, type Person } from './demo-data'

/**
 * Writes the demo workspace, leaving what is there already as it is, so it runs again without doubling anything: a
 * person, the workspace, a membership or a channel that exists is kept, and a channel that has messages gets none.
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
    for (const channel of channels) {
      await tx`
        insert into public.channels (organization_id, name, topic, author_id)
        values (${organization.id}, ${channel.name}, ${channel.topic}, ${userId(owner)})
        on conflict (organization_id, name) do nothing`
      const [row] = await tx<{ id: number; said: boolean }[]>`
        select id, exists (select from public.messages m where m.channel_id = c.id) as said
        from public.channels c where c.organization_id = ${organization.id} and c.name = ${channel.name}`
      if (row!.said) continue
      for (const message of messages.filter((each) => each.channel === channel.name)) {
        await tx`
          insert into public.messages (organization_id, channel_id, author_id, body, mentions, sent_at)
          values (${organization.id}, ${row!.id}, ${userId(message.author)}, ${message.body},
            ${tx.json((message.mentions ?? []).map(userId))}, ${sentAt(message, today)})`
      }
    }
  })

  return created
}

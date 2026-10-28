import { randomBytes } from 'node:crypto'
import { loadProjectAuth } from '@protobase/cli/auth'
import { addMember, createOrganization, createUser } from '@protobase/server'
import { root } from './chat-server'

// Two workspaces over the test's database: Ana, Ben and Dan in Northwind, Cara alone in Southwind, each a participant,
// Eve, Northwind's admin with the Moderator role, and the superuser, a member of Northwind.

const person = (email: string, name: string) => ({ email, name, password: randomBytes(12).toString('base64url') })
export const ana = person('ana@example.com', 'Ana Silva')
export const ben = person('ben@example.com', 'Ben Adeyemi')
export const cara = person('cara@example.com', 'Cara Lindqvist')
export const dan = person('dan@example.com', 'Dan Mwangi')
export const eve = person('eve@example.com', 'Eve Moreau')
/** The superuser, who holds every role, `*` included, in every workspace; a member of Northwind to work in it. */
export const superuser = person('admin@example.com', 'Admin')

/** The workspaces over `databaseUrl`, for the app at `appUrl`. */
export const makeWorkspaces = async (databaseUrl: string, appUrl: string) => {
  process.env.DATABASE_URL = databaseUrl
  process.env.PROTOBASE_URL = appUrl
  const auth = await loadProjectAuth(root)
  // The store's first account is a superuser, who holds every role in every workspace.
  await createUser(auth, { ...superuser, role: 'admin' })
  const ids = {
    ana: (await createUser(auth, ana)).id,
    ben: (await createUser(auth, ben)).id,
    cara: (await createUser(auth, cara)).id,
    dan: (await createUser(auth, dan)).id,
    eve: (await createUser(auth, eve)).id,
  }
  await createOrganization(auth, { name: 'Northwind', slug: 'northwind', owner: ana.email })
  await addMember(auth, { organization: 'northwind', email: ben.email, appRoles: ['participant'] })
  await addMember(auth, { organization: 'northwind', email: dan.email, appRoles: ['participant'] })
  await addMember(auth, { organization: 'northwind', email: eve.email, role: 'admin', appRoles: ['moderator'] })
  await addMember(auth, { organization: 'northwind', email: superuser.email })
  await createOrganization(auth, { name: 'Southwind', slug: 'southwind', owner: cara.email })

  /** Signs `who` in with their password, as the sign-in page does, and answers the headers of their API requests. */
  const as = async (who: typeof ana) => {
    const signIn = await fetch(`${appUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: appUrl },
      body: JSON.stringify({ email: who.email, password: who.password }),
    })
    if (!signIn.ok) throw new Error(`Signing in ${who.email} answered ${signIn.status}`)
    const cookie = signIn.headers.getSetCookie().map((each) => each.split(';')[0]).join('; ')
    const answer = await fetch(`${appUrl}/api/auth/token`, { headers: { cookie, origin: appUrl } })
    if (!answer.ok) throw new Error(`A token for ${who.email} answered ${answer.status}`)
    const { token } = (await answer.json()) as { token: string }
    return { authorization: `Bearer ${token}` }
  }
  return { ids, as }
}

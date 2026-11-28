import { everyOrganization } from '@protobase/query'
import { listOrganizations, listUsers, type AdminAuth, type ListedOrganization, type StoredUser } from '@protobase/server'

/** Every user, oldest first, read a page at a time. */
export const allUsers = async (auth: AdminAuth) => {
  const users: StoredUser[] = []
  let page = await listUsers(auth)
  users.push(...page.users)
  while (page.next) {
    page = await listUsers(auth, { after: page.next })
    users.push(...page.users)
  }
  return users
}

/** Every organization, oldest first, read a page at a time. */
export const allOrganizations = async (auth: AdminAuth) => {
  const scope = everyOrganization('the demo seed finds its workspace by slug among every organization')
  const organizations: ListedOrganization[] = []
  let page = await listOrganizations(auth, scope)
  organizations.push(...page.organizations)
  while (page.next) {
    page = await listOrganizations(auth, scope, { after: page.next })
    organizations.push(...page.organizations)
  }
  return organizations
}

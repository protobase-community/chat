import type { AuthHooks } from '@protobase/server'

/**
 * The app's own hooks on sign-in's events, which write only the app's tables. A new workspace starts with a public
 * #general channel, its creator's, so its first members have somewhere to talk; a workspace made before this hook keeps
 * the channels it has.
 */
export const onOrganizationCreated: AuthHooks['onOrganizationCreated'] = async ({ organization, member }, { db }) => {
  await db
    .insertInto('public.channels')
    .values({ organization_id: organization.id, name: 'general', kind: 'public', author_id: member.userId })
    .execute()
}

import { where, type AccessContext } from '@protobase/schema'

/** The most people one private channel or direct message holds, as the members picker can show them. */
export const maxMembers = 50

/** Whether a conversation's members are what the members field gives: an array of at most `maxMembers` user ids. */
export const memberIds = (members: unknown) =>
  Array.isArray(members) && members.length <= maxMembers && members.every((id) => typeof id === 'string' && id.length > 0)

/** The row filter of the conversations whose `member_ids` hold the signed-in person. */
export const holdsMe = (ctx: AccessContext) => where.has('member_ids', ctx.user!.id!)

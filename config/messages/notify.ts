import type { Db } from '@protobase/query'
import { parseRoles, sendNotification, subscription } from '@protobase/server'
import { roles } from '../roles'
import { notificationOf } from './notification'
import { toldOf, type Conversation } from './told-of'

/** The app's public address, which notifications link to; never one a request names. */
const appOrigin = () => {
  const url = process.env.PROTOBASE_URL
  if (!url) throw new Error('PROTOBASE_URL is not set: notifications link to the app at its address')
  return url
}

const ids = (value: unknown) => (Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [])

/** The channel or direct message a message is in. */
const conversationOf = async (db: Db, message: Record<string, unknown>): Promise<Conversation> => {
  if (message.channel_id != null) {
    const channel = await db.selectFrom('public.channels').select(['id', 'name', 'member_ids']).where('id', '=', Number(message.channel_id)).executeTakeFirstOrThrow()
    return { kind: 'channel', id: channel.id, name: channel.name, memberIds: channel.member_ids == null ? null : ids(channel.member_ids) }
  }
  const direct = await db.selectFrom('public.direct_messages').select(['id', 'member_ids']).where('id', '=', Number(message.direct_message_id)).executeTakeFirstOrThrow()
  return { kind: 'direct_message', id: direct.id, memberIds: ids(direct.member_ids) }
}

/**
 * Those of `people` who may read the workspace's messages: its members, not banned, whose roles there, global and the
 * membership's, grant `messages.read`. A superuser who is no member is left out, as the composer never offers them.
 */
const readersAmong = async (db: Db, organizationId: string, people: string[]) => {
  if (people.length === 0) return []
  const rows = await db
    .selectFrom('auth.member as member')
    .innerJoin('auth.user as user', 'user.id', 'member.user_id')
    .select(['user.id', 'user.role', 'member.app_roles'])
    .where('member.organization_id', '=', organizationId)
    .where('user.id', 'in', people)
    .where((eb) => eb.or([eb('user.banned', 'is not', true), eb('user.ban_expires', '<', new Date())]))
    .execute()
  return rows.filter((row) => roles.has({ id: row.id, roles: [...parseRoles(row.role), ...ids(row.app_roles)] }, 'messages.read')).map((row) => String(row.id))
}

/**
 * Tells the people a new message mentions, and in a direct message its other members, in their bell and as push: never
 * its author, and only those who may read it, since the notification shows its start.
 */
export const notifyOfMessages = subscription('notifyOfMessages', {
  events: ['messages.created'],
  run: async ({ data }, { db }) => {
    const message = data.after!
    const conversation = await conversationOf(db, message)
    const organizationId = String(message.organization_id)
    const recipients = await readersAmong(db, organizationId, toldOf({ author_id: String(message.author_id), mentions: ids(message.mentions) }, conversation))
    if (recipients.length === 0) return
    const author = await db.selectFrom('auth.user').select('name').where('id', '=', String(message.author_id)).executeTakeFirstOrThrow()
    const notification = notificationOf({ sender: author.name, body: message.body == null ? null : String(message.body) }, conversation, appOrigin())
    await sendNotification(db, { userIds: recipients, inbox: true }, notification)
  },
})

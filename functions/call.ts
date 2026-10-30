import { defineFunction, notFound } from '@protobase/server'
import { conversationOfCall } from '../config/conversations/call-address'

const ids = (value: unknown) => (Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [])

/**
 * A conversation's call, as its member's socket: `?resource=channels&key=7` or a direct message's. Protobase lets in
 * only someone who reads the conversation, the caller, and takes them out within a minute once they no longer do, such
 * as when they left a private channel. Each joins by their account's name, which guests see them by, may send their
 * microphone, camera and screen, and may share guest links. A direct message's call rings its other people, when this
 * join starts it; a channel's rings no one and shows in the channel as a call in progress.
 */
export default defineFunction({ roles: ['admin', 'participant', 'moderator'] }, async (request, { session, records, db, acceptWebSocket, calls }) => {
  const conversation = conversationOfCall(new URL(request.url))
  if (!conversation) throw notFound('Calls are on a channel or a direct message, named by the address')
  const me = String(session.user.id)
  const { name } = await db.selectFrom('auth.user').select('name').where('id', '=', me).executeTakeFirstOrThrow()
  const ring =
    conversation.resource === 'direct_messages'
      ? { users: ids((await records.get('direct_messages', conversation.key)).record.member_ids), title: `${name} is calling` }
      : undefined
  return acceptWebSocket(
    await calls.join({ record: conversation, member: me, name, publish: true, invites: true, ...(ring && { ring }) }),
  )
})

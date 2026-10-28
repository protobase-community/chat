import type { Conversation } from './conversation'

/** The most conversations of each kind, channels and direct messages, whose unread messages the sidebar counts. */
export const maxCounted = 100

/** How far the reader has read one of their conversations: the newest message id read, 0 for one never opened. */
export type ReadUpTo = { id: number; lastReadId: number }

/**
 * The filter of the messages `me` has not read in `conversations`, all of one kind: those of each one's flow after its
 * read position by someone else, replies in threads left out, and with `mentioned`, only those that mention them.
 * Undefined for no conversations. Each clause reads the index of a conversation's messages by id, so the count costs
 * what is unread, not the whole history.
 */
export const unreadFilter = (field: Conversation['field'], me: string, conversations: ReadUpTo[], mentioned = false) => {
  if (conversations.length === 0) return
  const after = conversations.map(({ id, lastReadId }) => `(${field} = ${id} AND id > ${lastReadId})`).join(' OR ')
  const mention = mentioned ? ` AND mentions:${JSON.stringify(me)}` : ''
  return `author_id != ${JSON.stringify(me)}${mention} AND isNull(thread_id) AND (${after})`
}

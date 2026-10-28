import type { useClient } from '@protobase/ui'
import { unreadFilter, maxCounted } from './unread-filter'
import { unreadMarks, type Counted } from './unread-marks'

/** A kind of conversation the sidebar marks: its resource, the message field pointing at it, its order, what it counts. */
export type ConversationKind = { resource: string; field: 'channel_id' | 'direct_message_id'; orderBy: string; counted: Counted }

type Client = ReturnType<typeof useClient>

const byGroup = (groups: { value: unknown; count: number }[]) => Object.fromEntries(groups.map(({ value, count }) => [String(value), count]))

/**
 * The marks of `me`'s unread conversations of one kind, read as them: the first `maxCounted` conversations they may
 * read, in the sidebar's order, their read positions, then the messages after those by others, counted per
 * conversation by the messages API, which leaves out whatever they may not read.
 */
export const countUnread = async (client: Client, { resource, field, orderBy, counted }: ConversationKind, me: string) => {
  const conversations = await client.list(resource, { orderBy, pageSize: maxCounted })
  const ids = conversations.items.map((conversation) => Number(conversation.id))
  if (ids.length === 0) return {}

  const positions = await client.list('read_positions', { filter: ids.map((id) => `${field} = ${id}`).join(' OR '), pageSize: maxCounted })
  const lastRead = new Map(positions.items.map((position) => [Number(position[field]), Number(position.last_read_id)]))
  const upTo = ids.map((id) => ({ id, lastReadId: lastRead.get(id) ?? 0 }))

  const count = (mentioned: boolean) =>
    client.aggregate('messages', { groupBy: field, filter: unreadFilter(field, me, upTo, mentioned), limit: maxCounted }).then(({ groups }) => byGroup(groups))
  const unread = await count(false)
  if (counted === 'messages') return unreadMarks(unread, unread, counted)
  return unreadMarks(unread, await count(true), counted)
}

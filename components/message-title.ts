import type { TitleReader } from '@protobase/ui'

/** What kind of message it is, as a search result says it. */
const kindOf = (record: Record<string, unknown>) => {
  if (record.thread_id != null) return 'thread reply'
  if (record.direct_message_id != null) return 'direct message'
  return 'channel message'
}

/** The day a message was sent, such as "3 Nov", with its year when that is not this year: "28 Oct 2025". */
export const sentDay = (sentAt: unknown, now = new Date()) => {
  const sent = new Date(String(sentAt))
  if (Number.isNaN(sent.getTime())) return
  const year = sent.getFullYear() === now.getFullYear() ? undefined : 'numeric'
  return sent.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year })
}

/**
 * A message's title for its reader, as search results show it: who wrote it ("You" for the reader), what kind of
 * message it is and the day, such as "Lena Fischer · thread reply · 3 Nov", so like results tell apart. Nothing while
 * its author is not known yet, so the record shows its key until the members load. A `TitleRule`.
 */
export const messageTitle = (record: Record<string, unknown>, { user, member }: Pick<TitleReader, 'user' | 'member'>, now = new Date()) => {
  const authorId = String(record.author_id)
  const author = authorId === user?.id ? 'You' : member(authorId)?.name
  if (!author) return
  return [author, kindOf(record), sentDay(record.sent_at, now)].filter(Boolean).join(' · ')
}

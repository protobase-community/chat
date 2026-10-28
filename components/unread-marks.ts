import type { RecordMark } from '@protobase/ui'

/** What a conversation's count counts: the unread messages that mention the reader, or all its unread messages. */
export type Counted = 'mentions' | 'messages'

const labels: Record<Counted, (count: number) => string> = {
  mentions: (count) => (count === 1 ? '1 unread mention' : `${count} unread mentions`),
  messages: (count) => (count === 1 ? '1 unread message' : `${count} unread messages`),
}

/**
 * The sidebar's marks of the conversations with unread messages, by id: bold, with the count of what `counted` names
 * when there is any. `unread` and `counts` are the numbers per conversation id; one with nothing unread has no mark.
 */
export const unreadMarks = (unread: Record<string, number>, counts: Record<string, number>, counted: Counted) => {
  const marks: Record<string, RecordMark> = {}
  for (const [id, total] of Object.entries(unread)) {
    if (total === 0) continue
    const count = counts[id] ?? 0
    marks[id] = count === 0 ? { strong: true, label: 'Unread messages' } : { strong: true, count, label: labels[counted](count) }
  }
  return marks
}

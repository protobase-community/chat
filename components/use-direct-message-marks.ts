import { useList, useMembers, usePresence, useSignedInUser, type RecordMark } from '@protobase/ui'
import { groupLabel } from './person-status'
import { useUnreadMarks } from './use-unread-marks'

/** As many direct messages as the sidebar lists (config/direct_messages/ui.ts), in its order. */
const listed = { orderBy: 'created_at desc', pageSize: 20, fields: ['id', 'member_ids'] }

/**
 * The `directMessages` marks of the sidebar (protobase.ui.tsx): the `unread` marks, and the other people's presence and
 * status. A one-to-one direct message's row names its other person, whose dot, busy or do not disturb mark and status
 * text Protobase draws beside the title; a group's row, which Protobase draws no person for, says each person's in its
 * tooltip and for screen readers.
 */
export const useDirectMessageMarks = (resource: string) => {
  const unread = useUnreadMarks(resource)
  const me = useSignedInUser()?.id
  const { member } = useMembers()
  const presence = usePresence()
  const conversations = useList('direct_messages', listed)
  if (unread === undefined && conversations.items.length === 0) return

  const marks: Record<string, RecordMark> = { ...unread }
  const now = Date.now()
  for (const conversation of conversations.items) {
    const ids = Array.isArray(conversation.member_ids) ? (conversation.member_ids as string[]) : []
    const others = ids.filter((id) => id !== me)
    const key = String(conversation.id)
    const mark = marks[key]
    if (others.length === 1) {
      marks[key] = { ...mark, person: others[0] }
      continue
    }
    const people = groupLabel(
      others.map((id) => ({ name: member(id)?.name ?? '', activity: presence?.[id], status: member(id)?.status })),
      now,
    )
    if (people === undefined) continue
    marks[key] = { ...mark, label: mark?.label ? `${people}, ${mark.label}` : people }
  }
  return marks
}

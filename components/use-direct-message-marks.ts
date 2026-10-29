import { useList, useMembers, useSignedInUser, type RecordMark } from '@protobase/ui'
import { directMessageLabel } from './person-status'
import { useUnreadMarks } from './use-unread-marks'
import { useWorkspacePresence } from './use-workspace-presence'

/** As many direct messages as the sidebar lists (config/direct_messages/ui.ts), in its order. */
const listed = { orderBy: 'created_at desc', pageSize: 20, fields: ['id', 'member_ids'] }

/**
 * The `directMessages` marks of the sidebar (protobase.ui.tsx): the `unread` marks, and in each row's tooltip and for
 * screen readers whether its other people are online or away and the status they set. The sidebar draws no element of
 * the app's own, so the presence dot and the status show beside the names in the conversation's header instead.
 */
export const useDirectMessageMarks = (resource: string) => {
  const unread = useUnreadMarks(resource)
  const me = useSignedInUser()?.id
  const { member } = useMembers()
  const presence = useWorkspacePresence()
  const conversations = useList('direct_messages', listed)
  if (unread === undefined && presence === undefined) return

  const marks: Record<string, RecordMark> = { ...unread }
  const now = Date.now()
  for (const conversation of conversations.items) {
    const ids = Array.isArray(conversation.member_ids) ? (conversation.member_ids as string[]) : []
    const others = ids.filter((id) => id !== me).map((id) => ({ name: member(id)?.name ?? '', activity: presence?.get(id), status: member(id)?.status }))
    const people = directMessageLabel(others, now)
    if (people === undefined) continue
    const key = String(conversation.id)
    const mark = marks[key]
    marks[key] = { ...mark, label: mark?.label ? `${people}, ${mark.label}` : people }
  }
  return marks
}

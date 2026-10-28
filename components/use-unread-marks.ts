import { useEffect, useState } from 'react'
import { useClient, useSignedInUser } from '@protobase/ui'
import { countUnread, type ConversationKind } from './count-unread'
import { followUnread, type Marks } from './follow-unread'

/** The conversations the sidebar marks, by the resource of their sidebar entry. */
const kinds: Record<string, ConversationKind> = {
  channels: { resource: 'channels', field: 'channel_id', orderBy: 'name asc', counted: 'mentions' },
  direct_messages: { resource: 'direct_messages', field: 'direct_message_id', orderBy: 'created_at desc', counted: 'messages' },
}

/** The resources whose changes can change what is unread. */
const affecting = new Set(['messages', 'read_positions', 'channels', 'direct_messages'])

/**
 * The `unread` marks of the sidebar (protobase.ui.tsx): each of the reader's conversations with unread messages bold,
 * with a count of its unread mentions, or of a direct message's unread messages. Counted again as the live stream tells
 * of a message, a read position or a conversation changed, a deleted message included. It answers no marks while it
 * counts first and after a count fails, reporting the failure as an uncaught error, so the sidebar still lists the
 * conversations: a hook that throws stops the whole sidebar. It throws only for a resource the sidebar never gives it.
 */
export const useUnreadMarks = (resource: string) => {
  const kind = kinds[resource]
  if (!kind) throw new Error(`The unread marks are of channels and direct messages, not ${resource}`)
  const client = useClient()
  const me = useSignedInUser()?.id
  const [marks, setMarks] = useState<Marks>()

  useEffect(() => {
    if (me === undefined) return
    return followUnread({
      count: () => countUnread(client, kind, me),
      listen: (recount) =>
        client.live({
          onChanges: (changes) => {
            if (changes.some((change) => affecting.has(change.resource))) recount()
          },
          onResync: recount,
        }),
      onMarks: setMarks,
      onError: reportError,
    })
  }, [client, kind, me])

  return marks
}

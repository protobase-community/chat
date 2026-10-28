import { useEffect, useState } from 'react'
import { useClient, useSignedInUser, type RecordMark } from '@protobase/ui'
import { countUnread, type ConversationKind } from './count-unread'

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
 * of a message, a read position or a conversation changed; a change while counting counts once more after it.
 */
export const useUnreadMarks = (resource: string) => {
  const kind = kinds[resource]
  if (!kind) throw new Error(`The unread marks are of channels and direct messages, not ${resource}`)
  const client = useClient()
  const me = useSignedInUser()?.id
  const [marks, setMarks] = useState<Record<string, RecordMark>>()

  useEffect(() => {
    if (me === undefined) return
    let shown = true
    let counting = false
    let again = false
    const count = async () => {
      if (counting) {
        again = true
        return
      }
      counting = true
      // A failed count rejects as it is, and the next change counts afresh.
      try {
        do {
          again = false
          const counted = await countUnread(client, kind, me)
          if (shown) setMarks(counted)
        } while (again && shown)
      } finally {
        counting = false
      }
    }
    void count()
    const stop = client.live({
      onChanges: (changes) => {
        if (changes.some((change) => affecting.has(change.resource))) void count()
      },
      onResync: () => void count(),
    })
    return () => {
      shown = false
      stop()
    }
  }, [client, kind, me])

  return marks
}

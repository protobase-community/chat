import { useCallback } from 'react'
import { useClient } from '@protobase/ui'
import type { Emoji } from './emoji'
import { toReaction, type Reaction } from './reaction'
import { useMessageRecords } from './use-message-records'

/**
 * The reactions to the messages `messageIds` names, the thread's loaded ones, followed live. `react` adds the reader's
 * reaction and `unreact` takes one of theirs back.
 */
export const useMessageReactions = (messageIds: readonly number[]) => {
  const client = useClient()
  const { records, add, drop, error, setError } = useMessageRecords('reactions', messageIds, toReaction, { follow: true })

  const react = useCallback(
    (messageId: number, emoji: Emoji) => client.create('reactions', { message_id: messageId, emoji }).then((created) => add([toReaction(created.record)]), setError),
    [client, add, setError],
  )

  const unreact = useCallback((reaction: Reaction) => client.remove('reactions', reaction.id, { etag: '*' }).then(() => drop(new Set([reaction.id])), setError), [client, drop, setError])

  return { reactions: records, react, unreact, error }
}

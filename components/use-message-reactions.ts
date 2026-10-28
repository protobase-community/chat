import { useCallback, useEffect, useRef, useState } from 'react'
import { useClient } from '@protobase/ui'
import type { Emoji } from './emoji'
import { changesOf } from './live-changes'
import { toReaction, type Reaction } from './reaction'

/** How many messages one read of reactions covers, so its filter stays short. */
const messagesPerRead = 50
/** The most reactions one request brings, the API's largest page. */
const reactionsPerPage = 500

/**
 * The reactions to the messages `messageIds` names, the thread's loaded ones: each message's read once it shows, and
 * those added or taken back as the live stream tells of them, read through the reactions API with the reader's own
 * access. `react` adds the reader's reaction and `unreact` takes one of theirs back.
 */
export const useMessageReactions = (messageIds: readonly number[]) => {
  const client = useClient()
  const [reactions, setReactions] = useState<ReadonlyMap<number, Reaction>>(new Map())
  const [error, setError] = useState<unknown>()
  // The messages whose reactions were read or are on their way, and those the thread shows, for the live stream's news.
  const read = useRef(new Set<number>())
  const shown = useRef(new Set<number>())
  shown.current = new Set(messageIds)

  const add = useCallback((incoming: readonly Reaction[]) => {
    const wanted = incoming.filter((reaction) => shown.current.has(reaction.message_id))
    if (wanted.length === 0) return
    setReactions((current) => new Map([...current, ...wanted.map((reaction) => [reaction.id, reaction] as const)]))
  }, [])

  const drop = useCallback((gone: ReadonlySet<number>) => setReactions((current) => new Map([...current].filter(([id]) => !gone.has(id)))), [])

  // Every page of the reactions `filter` finds, one after another.
  const readAll = useCallback(
    async (filter: string) => {
      let pageToken: string | undefined
      do {
        const page = await client.list('reactions', { filter, orderBy: 'id asc', pageSize: reactionsPerPage, pageToken })
        add(page.items.map((record) => toReaction(record)))
        pageToken = page.nextPageToken || undefined
      } while (pageToken)
    },
    [client, add],
  )

  const readOf = useCallback(
    (ids: readonly number[]) => {
      for (const id of ids) read.current.add(id)
      for (let start = 0; start < ids.length; start += messagesPerRead) {
        readAll(`in(message_id, ${ids.slice(start, start + messagesPerRead).join(', ')})`).catch(setError)
      }
    },
    [readAll],
  )

  useEffect(() => {
    const unread = messageIds.filter((id) => !read.current.has(id))
    if (unread.length > 0) readOf(unread)
  }, [messageIds, readOf])

  useEffect(
    () =>
      client.live({
        onChanges: (changes) => {
          const { created, deleted } = changesOf(changes, 'reactions')
          if (deleted.size > 0) drop(deleted)
          if (!created) return
          const keys = changes.filter((change) => change.resource === 'reactions' && change.operation !== 'delete').map((change) => Number(change.key))
          readAll(`in(id, ${keys.join(', ')})`).catch(setError)
        },
        onResync: () => {
          setReactions(new Map())
          read.current = new Set()
          readOf([...shown.current])
        },
      }),
    [client, readAll, readOf, drop],
  )

  const react = useCallback(
    (messageId: number, emoji: Emoji) => client.create('reactions', { message_id: messageId, emoji }).then((created) => add([toReaction(created.record)]), setError),
    [client, add],
  )

  const unreact = useCallback((reaction: Reaction) => client.remove('reactions', reaction.id, { etag: '*' }).then(() => drop(new Set([reaction.id])), setError), [client, drop])

  return { reactions: [...reactions.values()], react, unreact, error }
}

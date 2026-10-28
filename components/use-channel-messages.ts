import { useCallback, useEffect, useRef, useState } from 'react'
import { useClient } from '@protobase/ui'
import { mergeMessages, toMessage, type Message } from './message'

/** How many messages a page of the chat brings: the latest on opening, and each "Load earlier". */
export const pageSize = 50

/**
 * A channel's messages, oldest first: the latest page on opening, earlier pages on `loadEarlier`, and new ones as the
 * live stream tells of them, read through the messages API with the reader's own access. `send` posts the reader's
 * message, and `sent` counts their sends, the thread's `followKey`. Its reads belong to one channel: the component
 * that uses it is keyed by the channel (`key={channelId}`), so another channel starts afresh.
 */
export const useChannelMessages = (channelId: number) => {
  const client = useClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [hasEarlier, setHasEarlier] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [sent, setSent] = useState(0)
  const [error, setError] = useState<unknown>()
  // The newest id read, so the live stream's news is read as what came after it.
  const newest = useRef(0)

  const read = useCallback(
    (where: string, orderBy: 'id asc' | 'id desc') =>
      client.list('messages', { filter: `channel_id = ${channelId}${where}`, orderBy, pageSize }).then((page) => ({
        items: page.items.map((record) => toMessage(record)),
        more: page.nextPageToken !== '',
      })),
    [client, channelId],
  )

  const add = useCallback((incoming: Message[]) => {
    setMessages((current) => mergeMessages(current, incoming))
    for (const message of incoming) newest.current = Math.max(newest.current, message.id)
  }, [])

  const readLatest = useCallback(
    () =>
      read('', 'id desc').then(({ items, more }) => {
        newest.current = 0
        setMessages([])
        add(items)
        setHasEarlier(more)
      }, setError),
    [read, add],
  )

  // More news than one page is read as the latest page again, which "Load earlier" goes back from.
  const readNewer = useCallback(
    () => read(` AND id > ${newest.current}`, 'id asc').then(({ items, more }) => (more ? readLatest() : add(items)), setError),
    [read, add, readLatest],
  )

  useEffect(() => {
    void readLatest()
    return client.live({
      onChanges: (changes) => {
        if (changes.some((change) => change.resource === 'messages')) void readNewer()
      },
      onResync: () => void readLatest(),
    })
  }, [client, readLatest, readNewer])

  const loadEarlier = useCallback(() => {
    const first = messages[0]
    if (!first) return
    setLoadingEarlier(true)
    read(` AND id < ${first.id}`, 'id desc')
      .then(({ items, more }) => {
        add(items)
        setHasEarlier(more)
      }, setError)
      .finally(() => setLoadingEarlier(false))
  }, [messages, read, add])

  const send = useCallback(
    (body: string, mentions: string[]) => {
      setSent((count) => count + 1)
      client.create('messages', { channel_id: channelId, body, mentions }).then((created) => add([toMessage(created.record)]), setError)
    },
    [client, channelId, add],
  )

  return { messages, hasEarlier, loadEarlier, loadingEarlier, send, sent, error }
}

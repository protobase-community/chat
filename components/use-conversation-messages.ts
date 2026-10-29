import { useCallback, useEffect, useRef, useState } from 'react'
import { useClient } from '@protobase/ui'
import { chatFilter } from './chat-filter'
import type { Conversation } from './conversation'
import { changesOf } from './live-changes'
import { dropMessages, mergeMessages, replaceMessages, toMessage, type Message } from './message'

/** How many messages a page of the chat brings: the latest on opening, and each "Load earlier". */
export const pageSize = 50

/**
 * A conversation's messages outside threads, oldest first, or with `threadId` that thread's replies: the latest page on
 * opening, earlier pages on `loadEarlier`, and new ones as the live stream tells of them, read through the
 * messages API with the reader's own access; an edited message is read again, such as a thread's first message whose
 * replies changed, and a deleted one taken out as the stream tells of them too. `send` posts the reader's message, a
 * reply in the thread with `threadId`, with its files in one write, and `sent` counts their sends, the thread's
 * `followKey`; `edit` changes one of theirs and `remove` deletes one after its files. Its reads belong to one
 * conversation or thread: the component that uses it is keyed by it, so another one starts afresh.
 */
export const useConversationMessages = (conversation: Conversation, threadId?: number) => {
  const { field, id } = conversation
  const client = useClient()
  const shown = chatFilter(conversation, threadId)
  const [messages, setMessages] = useState<Message[]>([])
  const [hasEarlier, setHasEarlier] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [sent, setSent] = useState(0)
  const [error, setError] = useState<unknown>()
  // The newest id read, so the live stream's news is read as what came after it, and the oldest, so an edit before
  // what was read is left for "Load earlier" to bring.
  const newest = useRef(0)
  const oldest = useRef(Number.POSITIVE_INFINITY)

  const read = useCallback(
    (where: string, orderBy: 'id asc' | 'id desc') =>
      client.list('messages', { filter: `${shown}${where}`, orderBy, pageSize }).then((page) => ({
        items: page.items.map((record) => toMessage(record)),
        more: page.nextPageToken !== '',
      })),
    [client, shown],
  )

  const add = useCallback((incoming: Message[]) => {
    setMessages((current) => mergeMessages(current, incoming))
    for (const message of incoming) {
      newest.current = Math.max(newest.current, message.id)
      oldest.current = Math.min(oldest.current, message.id)
    }
  }, [])

  const drop = useCallback((gone: ReadonlySet<number>) => setMessages((current) => dropMessages(current, gone)), [])

  const readLatest = useCallback(
    () =>
      read('', 'id desc').then(({ items, more }) => {
        newest.current = 0
        oldest.current = Number.POSITIVE_INFINITY
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

  // The edited messages among those read, read again, replacing only those still shown: one deleted meanwhile stays out.
  const readEdited = useCallback(
    (keys: ReadonlySet<number>) => {
      const wanted = [...keys].filter((key) => key >= oldest.current && key <= newest.current)
      if (wanted.length === 0) return
      return read(` AND in(id, ${wanted.join(', ')})`, 'id asc').then(({ items }) => setMessages((current) => replaceMessages(current, items)), setError)
    },
    [read],
  )

  useEffect(() => {
    void readLatest()
    return client.live({
      onChanges: (changes) => {
        const { created, updated, deleted } = changesOf(changes, 'messages')
        if (deleted.size > 0) drop(deleted)
        if (updated.size > 0) void readEdited(updated)
        if (created) void readNewer()
      },
      onResync: () => void readLatest(),
    })
  }, [client, readLatest, readNewer, readEdited, drop])

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
    (body: string | undefined, mentions: string[], files: string[]) => {
      setSent((count) => count + 1)
      client
        .batchWrite([
          { op: 'create', resource: 'messages', ref: 'message', data: { [field]: id, thread_id: threadId, body, mentions } },
          ...files.map((file) => ({ op: 'create' as const, resource: 'attachments', data: { message_id: { $ref: 'message' }, file } })),
        ])
        .then(({ results }) => {
          const created = results[0]
          if (created?.op === 'create') add([toMessage(created.record)])
        }, setError)
    },
    [client, field, id, threadId, add],
  )

  const edit = useCallback(
    (messageId: number, body: string, mentions: string[]) =>
      client.update('messages', messageId, { body, mentions }, '*').then((updated) => setMessages((current) => replaceMessages(current, [toMessage(updated.record)])), setError),
    [client],
  )

  // Its files first, in the same write: the database keeps a message's files from outliving it.
  const remove = useCallback(
    (messageId: number, attachmentIds: number[]) =>
      client
        .batchWrite([
          ...attachmentIds.map((key) => ({ op: 'delete' as const, resource: 'attachments', key })),
          { op: 'delete', resource: 'messages', key: messageId },
        ])
        .then(() => drop(new Set([messageId])), setError),
    [client, drop],
  )

  return { messages, hasEarlier, loadEarlier, loadingEarlier, send, sent, edit, remove, error }
}

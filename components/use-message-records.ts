import { useCallback, useEffect, useRef, useState } from 'react'
import { useClient } from '@protobase/ui'
import { changesOf } from './live-changes'

/** How many messages one read covers, so its filter stays short. */
const messagesPerRead = 50
/** The most records one request brings, the API's largest page. */
const recordsPerPage = 500

/**
 * The records of `resource` under the messages `messageIds` names, the thread's loaded ones, such as their reactions:
 * each message's read once it shows, read through the API with the reader's own access. With `follow`, also those added
 * or deleted later as the live stream tells of them; records written only together with their message do
 * without. `add` and `drop` take in what the reader wrote.
 */
export const useMessageRecords = <T extends { id: number; message_id: number }>(
  resource: string,
  messageIds: readonly number[],
  toRecord: (record: Record<string, unknown>) => T,
  { follow }: { follow: boolean },
) => {
  const client = useClient()
  const [records, setRecords] = useState<ReadonlyMap<number, T>>(new Map())
  const [error, setError] = useState<unknown>()
  // The messages whose records were read or are on their way, and those the thread shows, for the live stream's news.
  const read = useRef(new Set<number>())
  const shown = useRef(new Set<number>())
  shown.current = new Set(messageIds)

  const add = useCallback((incoming: readonly T[]) => {
    const wanted = incoming.filter((record) => shown.current.has(record.message_id))
    if (wanted.length === 0) return
    setRecords((current) => new Map([...current, ...wanted.map((record) => [record.id, record] as const)]))
  }, [])

  const drop = useCallback((gone: ReadonlySet<number>) => setRecords((current) => new Map([...current].filter(([id]) => !gone.has(id)))), [])

  // Every page of the records `filter` finds, one after another.
  const readAll = useCallback(
    async (filter: string) => {
      let pageToken: string | undefined
      do {
        const page = await client.list(resource, { filter, orderBy: 'id asc', pageSize: recordsPerPage, pageToken })
        add(page.items.map((record) => toRecord(record)))
        pageToken = page.nextPageToken || undefined
      } while (pageToken)
    },
    [client, resource, toRecord, add],
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

  useEffect(() => {
    if (!follow) return
    return client.live({
      onChanges: (changes) => {
        const { created, deleted } = changesOf(changes, resource)
        if (deleted.size > 0) drop(deleted)
        if (!created) return
        const keys = changes.filter((change) => change.resource === resource && change.operation !== 'delete').map((change) => Number(change.key))
        readAll(`in(id, ${keys.join(', ')})`).catch(setError)
      },
      onResync: () => {
        setRecords(new Map())
        read.current = new Set()
        readOf([...shown.current])
      },
    })
  }, [client, follow, resource, readAll, readOf, drop])

  return { records: [...records.values()], add, drop, error, setError }
}

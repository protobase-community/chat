import { useCallback, useEffect, useRef, useState } from 'react'
import { useClient } from '@protobase/ui'
import type { Conversation } from './conversation'

type Position = { id: number; lastReadId: number }

/**
 * The reader's read position in a conversation, through the read_positions API, which keeps each person's to them.
 * `openedAt` is how far they had read when they opened it, 0 for one never opened and undefined while it loads: it stays
 * put while the conversation is open, so the "New messages" line does not move as they read. `readTo` moves the
 * position to a message they have read; it never moves back, and a move to where it already is writes nothing.
 */
export const useReadPosition = ({ field, id }: Conversation) => {
  const client = useClient()
  const [openedAt, setOpenedAt] = useState<number>()
  const [error, setError] = useState<unknown>()
  const position = useRef<Position>(undefined)
  // The write in flight, so moves follow each other in order rather than two tabs' worth of creates in one.
  const writing = useRef<Promise<void>>(Promise.resolve())

  const find = useCallback(
    () =>
      client.list('read_positions', { filter: `${field} = ${id}`, pageSize: 1 }).then(({ items: [found] }): Position | undefined => {
        if (!found) return
        return { id: Number(found.id), lastReadId: Number(found.last_read_id) }
      }),
    [client, field, id],
  )

  useEffect(() => {
    find().then((found) => {
      position.current = found
      setOpenedAt(found?.lastReadId ?? 0)
    }, setError)
  }, [find])

  const update = useCallback(
    (at: Position, lastReadId: number) =>
      client.update('read_positions', at.id, { last_read_id: lastReadId }, '*').then((saved) => {
        position.current = { id: at.id, lastReadId: Number(saved.record.last_read_id) }
      }),
    [client],
  )

  // A create another tab beat to it is an update of the position that tab made.
  const create = useCallback(
    (lastReadId: number) =>
      client.create('read_positions', { [field]: id, last_read_id: lastReadId }).then(
        (saved) => {
          position.current = { id: Number(saved.record.id), lastReadId }
        },
        async (failed: unknown) => {
          const found = await find()
          if (!found) throw failed
          return update(found, lastReadId)
        },
      ),
    [client, field, id, find, update],
  )

  const readTo = useCallback(
    (lastReadId: number) => {
      writing.current = writing.current.then(() => {
        if (openedAt === undefined) return
        const at = position.current
        if (at && at.lastReadId >= lastReadId) return
        return at ? update(at, lastReadId) : create(lastReadId)
      }).catch(setError)
    },
    [openedAt, update, create],
  )

  return { openedAt, readTo, error }
}

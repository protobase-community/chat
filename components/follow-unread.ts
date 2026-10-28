import type { RecordMark } from '@protobase/ui'

/** The sidebar's marks of one kind of conversation, by id. */
export type Marks = Record<string, RecordMark>

type Follow = {
  /** Counts the marks afresh. */
  count: () => Promise<Marks>
  /** Calls `recount` on each change that may change them, until the function it answers is called. */
  listen: (recount: () => void) => () => void
  onMarks: (marks: Marks | undefined) => void
  /** Gets a failed count's error, the marks having gone back to none. */
  onError: (error: unknown) => void
}

/**
 * Keeps the marks counted: once now, then on each change `listen` tells of; a change while counting counts once more
 * after it. A failed count takes the marks back to `undefined`, which the sidebar shows as conversations without marks,
 * hands its error to `onError` and never throws, and the next change counts afresh. Answers the function that stops it.
 */
export const followUnread = ({ count, listen, onMarks, onError }: Follow) => {
  let shown = true
  let counting = false
  let again = false
  const recount = async () => {
    if (counting) {
      again = true
      return
    }
    counting = true
    do {
      again = false
      const counted = await count().catch((error: unknown) => {
        if (shown) onMarks(undefined)
        onError(error)
        return 'failed' as const
      })
      if (counted === 'failed') break
      if (shown) onMarks(counted)
    } while (again && shown)
    counting = false
  }
  void recount()
  const stop = listen(() => void recount())
  return () => {
    shown = false
    stop()
  }
}

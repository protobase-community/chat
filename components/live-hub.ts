import type { LiveChange } from './live-changes'

/** What a page's part does as the live stream tells of changes, or that it missed some and should read again. */
export type LiveListener = { onChanges: (changes: readonly LiveChange[]) => void; onResync: () => void }

/**
 * One live stream shared by several listeners: `connect` opens it with the first listener and its stop closes it when the
 * last one leaves, so a page's parts hold one of the browser's few connections to the app between them.
 */
export const liveHub = (connect: (listener: LiveListener) => () => void) => {
  const listeners = new Set<LiveListener>()
  let stop: (() => void) | undefined
  const subscribe = (listener: LiveListener) => {
    listeners.add(listener)
    stop ??= connect({
      onChanges: (changes) => {
        for (const each of [...listeners]) each.onChanges(changes)
      },
      onResync: () => {
        for (const each of [...listeners]) each.onResync()
      },
    })
    return () => {
      listeners.delete(listener)
      if (listeners.size > 0) return
      stop?.()
      stop = undefined
    }
  }
  return { subscribe }
}

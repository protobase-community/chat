/**
 * Calls `run` with the latest value at most once every `gapMs`: the first at once, a later one when the gap has passed,
 * with whatever value came last, so values in between are dropped. `setTimer` answers the function that cancels it.
 * Answers the function that takes a value, and the one that drops a value still waiting.
 */
export const throttled = <T>(run: (value: T) => void, gapMs: number, clock: { now: () => number; setTimer: (run: () => void, ms: number) => () => void }) => {
  let lastAt = -Infinity
  let waiting: { value: T } | undefined
  let cancel: (() => void) | undefined

  const flush = () => {
    cancel = undefined
    if (!waiting) return
    const { value } = waiting
    waiting = undefined
    lastAt = clock.now()
    run(value)
  }
  const take = (value: T) => {
    waiting = { value }
    if (cancel) return
    const wait = lastAt + gapMs - clock.now()
    if (wait <= 0) return flush()
    cancel = clock.setTimer(flush, wait)
  }
  const drop = () => {
    waiting = undefined
    cancel?.()
    cancel = undefined
  }
  return { take, drop }
}

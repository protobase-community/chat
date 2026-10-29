/** A typer sends that they type at most this often, and a page shows them typing this long after the last. */
export const typingSendGapMs = 3_000
export const typingShownMs = 6_000

/** What a page broadcasts on its conversation's channel: whether its person types, in the conversation or a thread. */
export type TypingPayload = { typing: boolean; thread: number | null }

/** Who types where, by user id, until when. */
export type Typers = ReadonlyMap<string, { thread: number | null; until: number }>

const isPayload = (payload: unknown): payload is TypingPayload => {
  if (typeof payload !== 'object' || payload === null) return false
  const { typing, thread } = payload as Partial<TypingPayload>
  return typeof typing === 'boolean' && (thread === null || typeof thread === 'number')
}

/** The typers once `user` broadcast `payload`: typing until `typingShownMs` from now, or no longer. Others' payloads only. */
export const heard = (typers: Typers, user: unknown, payload: unknown, now: number): Typers => {
  if (typeof user !== 'string' || !isPayload(payload)) return typers
  const next = new Map(typers)
  if (payload.typing) next.set(user, { thread: payload.thread, until: now + typingShownMs })
  else next.delete(user)
  return next
}

/** Who types in `thread`, null for the conversation outside threads, now, leaving out `me`. */
export const typingIn = (typers: Typers, thread: number | null, now: number, me: string | undefined) =>
  [...typers].filter(([user, typing]) => user !== me && typing.thread === thread && typing.until > now).map(([user]) => user)

/** When the next of the typers stops showing, to draw them again then; undefined for none. */
export const nextExpiry = (typers: Typers) => {
  const times = [...typers.values()].map((typing) => typing.until)
  return times.length === 0 ? undefined : Math.min(...times)
}

/** The line above the composer for the names of those typing: one, two, or several; nothing for nobody. */
export const typingLine = (names: readonly string[]) => {
  if (names.length === 0) return
  if (names.length === 1) return `${names[0]} is typing…`
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`
  return 'Several people are typing…'
}

/** The clock a sender waits on, so a test can stand in for it; `setTimer` answers the function that cancels it. */
export type Clock = { now: () => number; setTimer: (run: () => void, ms: number) => () => void }

/**
 * What a composer broadcasts as its text changes: that its person types, at most once every `typingSendGapMs`, the
 * text written within a gap told once it has passed, and that they stopped, once, when they empty the box or send. `send`
 * broadcasts whether they type and answers whether it could, such as not before the channel is joined: one it could
 * not counts as not sent, so the next text tries again. `dispose` cancels a send still waiting.
 */
export const typingSender = (send: (typing: boolean) => boolean, clock: Clock) => {
  let sentAt = -Infinity
  let typing = false
  let cancel: (() => void) | undefined

  const announce = () => {
    cancel = undefined
    if (!send(true)) return
    sentAt = clock.now()
    typing = true
  }
  const dispose = () => {
    cancel?.()
    cancel = undefined
  }
  const stop = () => {
    dispose()
    if (!typing) return
    typing = false
    send(false)
  }
  const onText = (text: string) => {
    if (text.trim() === '') return stop()
    if (cancel) return
    const wait = sentAt + typingSendGapMs - clock.now()
    if (wait <= 0) return announce()
    cancel = clock.setTimer(announce, wait)
  }
  return { onText, onSent: stop, dispose }
}

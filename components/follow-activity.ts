import { idleAfterMs, pageActivity, type Activity } from './presence'

/** The page as `followActivity` sees it, so a test can stand in for the document and the clock. */
export type Page = {
  visible: () => boolean
  now: () => number
  /** Calls `onUse` on each click, key, touch or scroll and `onVisibility` when the page shows or hides, until the answer is called. */
  listen: (onUse: () => void, onVisibility: () => void) => () => void
  setTimer: (run: () => void, ms: number) => () => void
}

/**
 * Tells `onActivity` where the page stands now and each time that changes: online while it shows and was used within
 * `idleAfterMs`, away when it hides or once it was idle that long. Answers the function that stops it.
 */
export const followActivity = (page: Page, onActivity: (activity: Activity) => void) => {
  let lastUsedAt = page.now()
  let told: Activity | undefined
  let stopTimer: (() => void) | undefined

  const check = () => {
    stopTimer?.()
    stopTimer = undefined
    const activity = pageActivity({ visible: page.visible(), lastUsedAt }, page.now())
    // A page in use turns away by itself once idle long enough, so it checks again then.
    if (activity === 'online') stopTimer = page.setTimer(check, lastUsedAt + idleAfterMs - page.now())
    if (activity === told) return
    told = activity
    onActivity(activity)
  }
  const used = () => {
    lastUsedAt = page.now()
    // Every move of the mouse is a use: only one that turns the page online again needs a check.
    if (told !== 'online') check()
  }

  const stopListening = page.listen(used, check)
  check()
  return () => {
    stopListening()
    stopTimer?.()
  }
}

/** The browser's page: shown when its document is visible, used on pointer, key, touch and wheel input. */
export const browserPage: Page = {
  visible: () => document.visibilityState === 'visible',
  now: () => Date.now(),
  listen: (onUse, onVisibility) => {
    const uses = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const
    for (const use of uses) window.addEventListener(use, onUse, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      for (const use of uses) window.removeEventListener(use, onUse)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  },
  setTimer: (run, ms) => {
    const timer = setTimeout(run, ms)
    return () => clearTimeout(timer)
  },
}

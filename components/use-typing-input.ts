import { useCallback, useEffect, useMemo, useRef } from 'react'
import { typingSender, type Clock } from './typing'

const browserClock: Clock = {
  now: () => Date.now(),
  setTimer: (run, ms) => {
    const timer = setTimeout(run, ms)
    return () => clearTimeout(timer)
  },
}

/**
 * Follows what the reader writes in a composer's box, through the box's own `input` events, and tells `onTyping` that
 * they type, at most once every few seconds, and that they stopped, when they empty the box or send (`onSent`).
 * `onTyping` answers whether it could tell, as the conversation's channel may not be joined yet.
 */
export const useTypingInput = (onTyping: ((typing: boolean) => boolean) | undefined) => {
  const latest = useRef(onTyping)
  useEffect(() => {
    latest.current = onTyping
  }, [onTyping])
  const sender = useMemo(() => typingSender((typing) => latest.current?.(typing) ?? false, browserClock), [])
  useEffect(() => sender.dispose, [sender])
  const inputRef = useCallback(
    (box: HTMLTextAreaElement | null) => {
      if (!box) return
      const onInput = () => sender.onText(box.value)
      box.addEventListener('input', onInput)
      return () => box.removeEventListener('input', onInput)
    },
    [sender],
  )
  return { inputRef, onSent: sender.onSent }
}

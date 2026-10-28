import { useState } from 'react'
import { firstUnreadId } from './first-unread'
import type { Message } from './message'

/**
 * The id of the message the "New messages" line goes above, or undefined for none: decided once, when the first
 * messages and the read position at opening are both there, and kept while the conversation is open, so the line
 * neither moves nor appears under a reader following new messages as they come.
 */
export const useNewLine = (messages: Message[], openedAt: number | undefined, me: string | undefined, hasEarlier: boolean) => {
  const [line, setLine] = useState<{ above: number | undefined }>()
  if (!line && openedAt !== undefined && me !== undefined && messages.length > 0) {
    const decided = { above: firstUnreadId(messages, openedAt, me, hasEarlier) }
    setLine(decided)
    return decided.above
  }
  return line?.above
}

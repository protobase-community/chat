import { sameChatDay } from '@protobase/ui'
import type { Message } from './message'

/** How long after a message the same author's next one still joins it, so a quick run of messages reads as one. */
export const groupWindowMs = 5 * 60_000

/**
 * Each message with what the thread draws before and around it: `newDay` for a day divider above it, and `continued`
 * when it follows the same author's message of a moment ago, so it leaves out their avatar, name and time.
 */
export const threadRows = (messages: Message[]) =>
  messages.map((message, index) => {
    const previous = messages[index - 1]
    const newDay = !previous || !sameChatDay(previous.sent_at, message.sent_at)
    const soon = !!previous && Date.parse(message.sent_at) - Date.parse(previous.sent_at) < groupWindowMs
    return { message, newDay, continued: !newDay && soon && previous.author_id === message.author_id }
  })

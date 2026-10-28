import type { Message } from './message'

/**
 * The id of the message the "New messages" line goes above: the first one after `lastReadId` by someone other than
 * `me`, or undefined when none is unread. When that is the first message loaded and earlier ones are not, the first
 * unread one may be among those, so there is no line rather than one in the wrong place.
 */
export const firstUnreadId = (messages: Message[], lastReadId: number, me: string, hasEarlier: boolean) => {
  const index = messages.findIndex((message) => message.id > lastReadId && message.author_id !== me)
  if (index === -1) return
  if (index === 0 && hasEarlier) return
  return messages[index]!.id
}

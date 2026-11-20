import { appPath } from '@protobase/schema'
import { conversationAddress } from '../../components/thread-address'
import type { Conversation } from './told-of'

/** The most characters of a message a notification shows, its start. */
export const excerptLength = 120

/** The start of a message on one line: its first `excerptLength` characters, with `…` when it goes on. */
export const excerpt = (body: string) => {
  const characters = Array.from(body.replace(/\s+/g, ' ').trim())
  if (characters.length <= excerptLength) return characters.join('')
  return `${characters.slice(0, excerptLength - 1).join('').trimEnd()}…`
}

/** The conversation's page, with the thread of `threadId` open beside it when given. */
export const conversationPath = (conversation: Conversation, threadId?: number) =>
  appPath(conversationAddress({ field: conversation.kind === 'channel' ? 'channel_id' : 'direct_message_id', id: conversation.id }, threadId))

/** What a notification says of a message of files alone, which has no text to show the start of. */
export const filesAloneText = 'Sent files'

/** Who sent a message where, and whether as a reply in a thread. */
const titleOf = (message: { sender: string; threadId: number | null }, conversation: Conversation) => {
  if (conversation.kind === 'channel') return `${message.sender} mentioned you in ${message.threadId !== null ? 'a thread in ' : ''}#${conversation.name}`
  if (message.threadId !== null) return `${message.sender} replied in a thread of your direct message`
  return `${message.sender} sent you a direct message`
}

/**
 * What a person is told of a message: who sent it where, its start or that it holds files alone (a null body), and a
 * link to the conversation on `origin`, with a reply's thread, by its first message `threadId`, open beside it.
 */
export const notificationOf = (message: { sender: string; body: string | null; threadId: number | null }, conversation: Conversation, origin: string) => ({
  title: titleOf(message, conversation),
  body: message.body === null ? filesAloneText : excerpt(message.body),
  url: new URL(conversationPath(conversation, message.threadId ?? undefined), origin).href,
})

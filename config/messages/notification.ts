import { appPath } from '@protobase/schema'
import type { Conversation } from './told-of'

/** The most characters of a message a notification shows, its start. */
export const excerptLength = 120

/** The start of a message on one line: its first `excerptLength` characters, with `…` when it goes on. */
export const excerpt = (body: string) => {
  const characters = Array.from(body.replace(/\s+/g, ' ').trim())
  if (characters.length <= excerptLength) return characters.join('')
  return `${characters.slice(0, excerptLength - 1).join('').trimEnd()}…`
}

/** The conversation's page, the standard record page of its channel or direct message. */
export const conversationPath = (conversation: Conversation) =>
  appPath({ kind: 'record', resource: conversation.kind === 'channel' ? 'channels' : 'direct_messages', key: conversation.id })

/** What a notification says of a message of files alone, which has no text to show the start of. */
export const filesAloneText = 'Sent files'

/** Who sent a message where, and whether as a reply in a thread. */
const titleOf = (message: { sender: string; reply: boolean }, conversation: Conversation) => {
  if (conversation.kind === 'channel') return `${message.sender} mentioned you in ${message.reply ? 'a thread in ' : ''}#${conversation.name}`
  if (message.reply) return `${message.sender} replied in a thread of your direct message`
  return `${message.sender} sent you a direct message`
}

/**
 * What a person is told of a message: who sent it where, its start or that it holds files alone (a null body), and a
 * link to the conversation on `origin`, a reply's too.
 */
export const notificationOf = (message: { sender: string; body: string | null; reply: boolean }, conversation: Conversation, origin: string) => ({
  title: titleOf(message, conversation),
  body: message.body === null ? filesAloneText : excerpt(message.body),
  url: new URL(conversationPath(conversation), origin).href,
})

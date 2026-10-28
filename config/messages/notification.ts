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

/**
 * What a person is told of a message: who sent it where, its start or that it holds files alone (a null body), and a
 * link to the conversation on `origin`.
 */
export const notificationOf = (message: { sender: string; body: string | null }, conversation: Conversation, origin: string) => ({
  title: conversation.kind === 'channel' ? `${message.sender} mentioned you in #${conversation.name}` : `${message.sender} sent you a direct message`,
  body: message.body === null ? filesAloneText : excerpt(message.body),
  url: new URL(conversationPath(conversation), origin).href,
})

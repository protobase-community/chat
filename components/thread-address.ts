import type { AppAddress } from '@protobase/schema'
import type { Conversation } from './conversation'

/** The record page `panel` naming an open thread: `thread-` and its first message's id, as `?panel=thread-42`. */
export const threadPanelPrefix = 'thread-'

/** The resource whose record page is a conversation, by the message field that points at it. */
const conversationResources = { channel_id: 'channels', direct_message_id: 'direct_messages' } as const

/**
 * The address of a conversation's page, with the thread of `threadId` open beside it when given. The one place a
 * conversation's or thread's address is made.
 */
export const conversationAddress = ({ field, id }: Conversation, threadId?: number): AppAddress => ({
  kind: 'record',
  resource: conversationResources[field],
  key: id,
  ...(threadId !== undefined && { panel: `${threadPanelPrefix}${threadId}` }),
})

/** The thread a record page's `panel` opens, by its first message's id; undefined for none or another panel. */
export const threadOfPanel = (panel: string | undefined) => {
  if (!panel?.startsWith(threadPanelPrefix)) return
  const id = Number(panel.slice(threadPanelPrefix.length))
  return Number.isSafeInteger(id) && id > 0 ? id : undefined
}

/** Where a message is read: its conversation's page, with its thread open for a reply. Undefined for neither. */
export const messageAddress = (message: Record<string, unknown>) => {
  const threadId = message.thread_id == null ? undefined : Number(message.thread_id)
  if (message.channel_id != null) return conversationAddress({ field: 'channel_id', id: Number(message.channel_id) }, threadId)
  if (message.direct_message_id != null) return conversationAddress({ field: 'direct_message_id', id: Number(message.direct_message_id) }, threadId)
  return
}

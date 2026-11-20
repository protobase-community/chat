import { useAppAddress } from '@protobase/ui'
import type { Conversation } from './conversation'
import { conversationAddress, threadOfPanel } from './thread-address'

/**
 * The thread open beside a conversation, which its page's address names, so a link opens one, such as a search result
 * for a reply: its first message's id, `threadTo` the address of a thread for a link to it, and `close` the conversation
 * alone again.
 */
export const useOpenThread = (conversation: Conversation) => {
  const { address, go } = useAppAddress()
  const threadId = address?.kind === 'record' ? threadOfPanel(address.panel) : undefined
  return {
    threadId,
    threadTo: (id: number) => conversationAddress(conversation, id),
    close: () => go(conversationAddress(conversation)),
  }
}

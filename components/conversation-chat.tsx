import { ChatThread, useMembers } from '@protobase/ui'
import type { Conversation } from './conversation'
import { ConversationComposer } from './conversation-composer'
import { ConversationMessages } from './conversation-messages'
import { useConversationMessages } from './use-conversation-messages'

type Props = { conversation: Conversation; topic?: string; empty: string; placeholder: string }

/**
 * A conversation's chat: its messages, followed live, and the composer under them. The thread scrolls inside a box of
 * the window's height, as the chat parts do, so the composer stays in view while a reader goes back through it. Key
 * it by the conversation, so another one starts afresh.
 */
export const ConversationChat = ({ conversation, topic, empty, placeholder }: Props) => {
  const chat = useConversationMessages(conversation)
  const { member } = useMembers()
  return (
    <div className="flex h-[70vh] min-h-80 flex-col">
      {topic && <p className="pb-2 text-sm text-muted-foreground">{topic}</p>}
      <ChatThread
        length={chat.messages.length}
        followKey={chat.sent}
        onLoadEarlier={chat.hasEarlier ? chat.loadEarlier : undefined}
        loadingEarlier={chat.loadingEarlier}
        empty={empty}
      >
        <ConversationMessages messages={chat.messages} member={member} />
      </ChatThread>
      {chat.error !== undefined && <p className="px-4 text-sm text-danger-text">Could not read or send the messages. Reload the page to try again.</p>}
      <div className="pt-3">
        <ConversationComposer placeholder={placeholder} onSend={chat.send} />
      </div>
    </div>
  )
}

import { ChatThread, useMembers, useSignedInUser } from '@protobase/ui'
import type { Conversation } from './conversation'
import { ConversationComposer } from './conversation-composer'
import { ConversationMessages } from './conversation-messages'
import { useConversationMessages } from './use-conversation-messages'
import { useNewLine } from './use-new-line'
import { useReadPosition } from './use-read-position'

type Props = { conversation: Conversation; topic?: string; empty: string; placeholder: string }

/**
 * A conversation's chat: its messages, followed live, and the composer under them. The thread scrolls inside a box of
 * the window's height, as the chat parts do, so the composer stays in view while a reader goes back through it. It
 * shows its messages once the reader's read position is there too, so it opens on the "New messages" line above the
 * first one they have not read, and it moves their position to the newest message whenever they have read to the end.
 * Key it by the conversation, so another one starts afresh.
 */
export const ConversationChat = ({ conversation, topic, empty, placeholder }: Props) => {
  const chat = useConversationMessages(conversation)
  const position = useReadPosition(conversation)
  const me = useSignedInUser()?.id
  const { member } = useMembers()
  const ready = position.openedAt !== undefined && me !== undefined
  const newLineAbove = useNewLine(chat.messages, position.openedAt, me, chat.hasEarlier)
  const readToEnd = () => {
    const newest = chat.messages.at(-1)
    if (newest) position.readTo(newest.id)
  }
  const error = chat.error ?? position.error
  return (
    <div className="flex h-[70vh] min-h-80 flex-col">
      {topic && <p className="pb-2 text-sm text-muted-foreground">{topic}</p>}
      <ChatThread
        length={ready ? chat.messages.length : 0}
        followKey={chat.sent}
        onLoadEarlier={chat.hasEarlier ? chat.loadEarlier : undefined}
        loadingEarlier={chat.loadingEarlier}
        onReadToEnd={readToEnd}
        empty={empty}
      >
        {ready && <ConversationMessages messages={chat.messages} member={member} newLineAbove={newLineAbove} />}
      </ChatThread>
      {error !== undefined && <p className="px-4 text-sm text-danger-text">Could not read or send the messages. Reload the page to try again.</p>}
      <div className="pt-3">
        <ConversationComposer placeholder={placeholder} onSend={chat.send} />
      </div>
    </div>
  )
}

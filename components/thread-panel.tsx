import { useMemo } from 'react'
import { ChatDivider, ChatThread, SidePanel } from '@protobase/ui'
import type { Conversation } from './conversation'
import { ConversationComposer } from './conversation-composer'
import type { MessageHandlers } from './conversation-message'
import { ConversationMessages } from './conversation-messages'
import type { Message } from './message'
import type { Person } from './people'
import { replyCountLabel } from './reply-labels'
import { TypingLine } from './typing-line'
import { useConversationMessages } from './use-conversation-messages'
import type { useConversationTyping } from './use-conversation-typing'
import { useMessageAttachments } from './use-message-attachments'
import { useMessageReactions } from './use-message-reactions'

type Props = {
  conversation: Conversation
  /** The thread's first message, as the conversation's flow holds it, with its count of replies. */
  first: Message
  me: string
  member: (id: string) => Person | undefined
  /** The conversation's typing, whose typers in this thread show above its box. */
  typing: ReturnType<typeof useConversationTyping>
  /** Edit and delete the first message, through the flow that holds it. */
  onEditFirst: MessageHandlers['onEdit']
  onDeleteFirst: MessageHandlers['onDelete']
  onClose: () => void
}

/**
 * A thread beside its conversation: its first message, its replies followed live, and a box of its own to reply in,
 * with mentions and files as in the conversation, and who else types a reply above it. The reader edits and deletes their replies and reacts to any. Key it
 * by the first message, so another thread starts afresh.
 */
export const ThreadPanel = ({ conversation, first, me, member, typing, onEditFirst, onDeleteFirst, onClose }: Props) => {
  const thread = useConversationMessages(conversation, first.id)
  const messageIds = useMemo(() => [first.id, ...thread.messages.map((message) => message.id)], [first.id, thread.messages])
  const reactions = useMessageReactions(messageIds)
  const attachments = useMessageAttachments(messageIds)
  const error = thread.error ?? reactions.error ?? attachments.error
  const shared = { reactions: reactions.reactions, attachments: attachments.attachments, me, member, onReact: reactions.react, onUnreact: reactions.unreact }
  return (
    <SidePanel
      title="Thread"
      onClose={onClose}
      footer={
        <>
          <TypingLine typers={typing.typers} thread={first.id} />
          <ConversationComposer placeholder="Reply…" onSend={thread.send} onTyping={(on) => typing.send({ typing: on, thread: first.id })} />
        </>
      }
    >
      <ChatThread
        length={thread.messages.length + 1}
        followKey={thread.sent}
        onLoadEarlier={thread.hasEarlier ? thread.loadEarlier : undefined}
        loadingEarlier={thread.loadingEarlier}
      >
        <ConversationMessages messages={[first]} onEdit={onEditFirst} onDelete={onDeleteFirst} {...shared} />
        {first.reply_count > 0 && <ChatDivider label={replyCountLabel(first.reply_count)} />}
        <ConversationMessages messages={thread.messages} shownAbove={first.sent_at} onEdit={thread.edit} onDelete={thread.remove} {...shared} />
      </ChatThread>
      {error !== undefined && <p className="px-4 pb-2 text-sm text-danger-text">Could not read or change the replies. Reload the page to try again.</p>}
    </SidePanel>
  )
}

import { useMemo, type ReactNode } from 'react'
import { ChatThread, useMembers, useSignedInUser } from '@protobase/ui'
import type { Conversation } from './conversation'
import { ConversationCall } from './conversation-call'
import { ConversationComposer } from './conversation-composer'
import { ConversationMessages } from './conversation-messages'
import { ThreadPanel } from './thread-panel'
import { TypingLine } from './typing-line'
import { useConversationMessages } from './use-conversation-messages'
import { useConversationTyping } from './use-conversation-typing'
import { useMessageAttachments } from './use-message-attachments'
import { useMessageReactions } from './use-message-reactions'
import { useNewLine } from './use-new-line'
import { useOpenThread } from './use-open-thread'
import { useReadPosition } from './use-read-position'
import { useThreadFirst } from './use-thread-first'

type Props = { conversation: Conversation; header: ReactNode; empty: string; placeholder: string }

/**
 * A conversation's chat, filling its record page: the header, its messages outside threads, followed live, and the
 * composer under them, with the thread its address opens beside them, such as a search result for a reply. The page does not scroll; the messages scroll in a
 * box of their own, so the composer stays in view while a reader goes back through them. It shows its messages once the reader's read position is there
 * too, so it opens on the "New messages" line above the first one they have not read, and it moves their position to the
 * newest message whenever they have read to the end. Its messages carry their files, reactions and replies' count, and
 * the reader edits their own and deletes those they may. Above the composer, and the thread's, shows who else types
 * there. While the page joins the conversation's call, the call shows beside the messages, above them on a phone, so
 * what people write during it is the conversation's own messages. Key it by the conversation, so another one starts
 * afresh.
 */
export const ConversationChat = ({ conversation, header, empty, placeholder }: Props) => {
  const chat = useConversationMessages(conversation)
  const thread = useOpenThread(conversation)
  const threadFirst = useThreadFirst(conversation, chat.messages, thread.threadId)
  const messageIds = useMemo(() => chat.messages.map((message) => message.id), [chat.messages])
  const reactions = useMessageReactions(messageIds)
  const attachments = useMessageAttachments(messageIds)
  const position = useReadPosition(conversation)
  const typing = useConversationTyping(conversation)
  const me = useSignedInUser()?.id
  const { member } = useMembers()
  const ready = position.openedAt !== undefined && me !== undefined
  const newLineAbove = useNewLine(chat.messages, position.openedAt, me, chat.hasEarlier)
  const readToEnd = () => {
    const newest = chat.messages.at(-1)
    if (newest) position.readTo(newest.id)
  }
  const error = chat.error ?? position.error ?? reactions.error ?? attachments.error ?? threadFirst.error
  return (
    <div className="flex min-h-0 flex-col md:flex-row">
      <ConversationCall className="h-1/2 shrink-0 border-b border-border md:h-auto md:w-3/5 md:border-r md:border-b-0" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {header}
        <ChatThread
          length={ready ? chat.messages.length : 0}
          followKey={chat.sent}
          onLoadEarlier={chat.hasEarlier ? chat.loadEarlier : undefined}
          loadingEarlier={chat.loadingEarlier}
          onReadToEnd={readToEnd}
          empty={empty}
        >
          {ready && (
            <ConversationMessages
              messages={chat.messages}
              reactions={reactions.reactions}
              attachments={attachments.attachments}
              me={me}
              member={member}
              newLineAbove={newLineAbove}
              onEdit={chat.edit}
              onDelete={chat.remove}
              onReact={reactions.react}
              onUnreact={reactions.unreact}
              threadTo={thread.threadTo}
            />
          )}
        </ChatThread>
        {error !== undefined && <p className="px-4 text-sm text-danger-text">Could not read or change the messages. Reload the page to try again.</p>}
        <div className="shrink-0 px-3 pb-3">
          <TypingLine typers={typing.typers} thread={null} />
          <ConversationComposer placeholder={placeholder} onSend={chat.send} onTyping={(on) => typing.send({ typing: on, thread: null })} />
        </div>
      </div>
      {threadFirst.first && me !== undefined && (
        <ThreadPanel
          key={threadFirst.first.id}
          conversation={conversation}
          first={threadFirst.first}
          me={me}
          member={member}
          typing={typing}
          onEditFirst={chat.edit}
          onDeleteFirst={chat.remove}
          onClose={thread.close}
        />
      )}
    </div>
  )
}

import { useMemo, useState, type ReactNode } from 'react'
import { ChatThread, useMembers, useSignedInUser } from '@protobase/ui'
import type { Conversation } from './conversation'
import { ConversationComposer } from './conversation-composer'
import { ConversationMessages } from './conversation-messages'
import { ThreadPanel } from './thread-panel'
import { useConversationMessages } from './use-conversation-messages'
import { useMessageAttachments } from './use-message-attachments'
import { useMessageReactions } from './use-message-reactions'
import { useNewLine } from './use-new-line'
import { useReadPosition } from './use-read-position'

type Props = { conversation: Conversation; header: ReactNode; empty: string; placeholder: string }

/**
 * A conversation's chat, filling its record page: the header, its messages outside threads, followed live, and the
 * composer under them, with the thread the reader opened beside them. The page does not scroll; the messages scroll in a
 * box of their own, so the composer stays in view while a reader goes back through them. It shows its messages once the reader's read position is there
 * too, so it opens on the "New messages" line above the first one they have not read, and it moves their position to the
 * newest message whenever they have read to the end. Its messages carry their files, reactions and replies' count, and
 * the reader edits their own and deletes those they may. It listens to a `SharedLive` around it. Key it by the
 * conversation, so another one starts afresh.
 */
export const ConversationChat = ({ conversation, header, empty, placeholder }: Props) => {
  const chat = useConversationMessages(conversation)
  const [threadId, setThreadId] = useState<number>()
  const threadFirst = chat.messages.find((message) => message.id === threadId)
  const messageIds = useMemo(() => chat.messages.map((message) => message.id), [chat.messages])
  const reactions = useMessageReactions(messageIds)
  const attachments = useMessageAttachments(messageIds)
  const position = useReadPosition(conversation)
  const me = useSignedInUser()?.id
  const { member } = useMembers()
  const ready = position.openedAt !== undefined && me !== undefined
  const newLineAbove = useNewLine(chat.messages, position.openedAt, me, chat.hasEarlier)
  const readToEnd = () => {
    const newest = chat.messages.at(-1)
    if (newest) position.readTo(newest.id)
  }
  const error = chat.error ?? position.error ?? reactions.error ?? attachments.error
  return (
    <div className="flex min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
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
              onOpenThread={setThreadId}
            />
          )}
        </ChatThread>
        {error !== undefined && <p className="px-4 text-sm text-danger-text">Could not read or change the messages. Reload the page to try again.</p>}
        <div className="shrink-0 p-3">
          <ConversationComposer placeholder={placeholder} onSend={chat.send} />
        </div>
      </div>
      {threadFirst && me !== undefined && (
        <ThreadPanel
          key={threadFirst.id}
          conversation={conversation}
          first={threadFirst}
          me={me}
          member={member}
          onEditFirst={chat.edit}
          onDeleteFirst={chat.remove}
          onClose={() => setThreadId(undefined)}
        />
      )}
    </div>
  )
}

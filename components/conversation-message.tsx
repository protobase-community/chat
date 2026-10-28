import { useState } from 'react'
import { ChatMessage, MentionedText } from '@protobase/ui'
import type { Attachment } from './attachment'
import { DeleteMessageDialog } from './delete-message-dialog'
import type { Emoji } from './emoji'
import type { Message } from './message'
import { MessageActions } from './message-actions'
import { MessageAttachments } from './message-attachments'
import { MessageEditor } from './message-editor'
import type { Person } from './people'
import { ReactionChips } from './reaction-chips'
import { ThreadSummary } from './thread-summary'
import type { Reaction, ReactionGroup } from './reaction'

/**
 * What the reader does to the chat's messages: edit their own, delete those they may, react and take their reactions
 * back, and, in a conversation's flow, open a message's thread.
 */
export type MessageHandlers = {
  onEdit: (messageId: number, body: string, mentions: string[]) => void
  /** Deletes the message with its files, which go first. */
  onDelete: (messageId: number, attachmentIds: number[]) => void
  onReact: (messageId: number, emoji: Emoji) => void
  onUnreact: (reaction: Reaction) => void
  onOpenThread?: (messageId: number) => void
}

type Props = MessageHandlers & {
  message: Message
  continued: boolean
  mine: boolean
  reactions: readonly ReactionGroup[]
  attachments: readonly Attachment[]
  member: (id: string) => Person | undefined
}

/**
 * One message under its author: its text, or a box to change it while its author edits it, then its files and, in the
 * conversation's flow, its thread's replies, with a footer of "(edited)" once changed and its reactions, and what the
 * reader can do to it in a bar shown while they point at it. A message with replies is not deleted, so nobody's replies
 * go with it.
 */
export const ConversationMessage = ({ message, continued, mine, reactions, attachments, member, onEdit, onDelete, onReact, onUnreact, onOpenThread }: Props) => {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const react = (emoji: Emoji) => onReact(message.id, emoji)
  const openThread = onOpenThread && (() => onOpenThread(message.id))
  const deletable = (mine || message.deletable) && message.reply_count === 0
  const footer = (message.edited_at || reactions.length > 0) && (
    <span className="flex flex-wrap items-center gap-1">
      {message.edited_at && <span title={new Date(message.edited_at).toLocaleString()}>(edited)</span>}
      <ReactionChips groups={reactions} member={member} onReact={react} onUnreact={onUnreact} />
    </span>
  )
  return (
    <div className="group relative">
      {!editing && (
        <MessageActions
          groups={reactions}
          onReact={react}
          onReply={openThread}
          onEdit={mine ? () => setEditing(true) : undefined}
          onDelete={deletable ? () => setDeleting(true) : undefined}
        />
      )}
      <ChatMessage author={{ id: message.author_id, name: member(message.author_id)?.name }} time={message.sent_at} continued={continued} footer={footer}>
        {editing ? (
          <MessageEditor
            message={message}
            member={member}
            onCancel={() => setEditing(false)}
            onSave={(body, mentions) => {
              setEditing(false)
              onEdit(message.id, body, mentions)
            }}
          />
        ) : (
          message.body !== null && <MentionedText text={message.body} mentions={message.mentions.map((id) => ({ name: member(id)?.name }))} />
        )}
        {attachments.length > 0 && <MessageAttachments attachments={attachments} />}
        {openThread && message.reply_count > 0 && <ThreadSummary count={message.reply_count} lastReplyAt={message.last_reply_at} onOpen={openThread} />}
      </ChatMessage>
      {deleting && (
        <DeleteMessageDialog
          onClose={() => setDeleting(false)}
          onDelete={() => {
            setDeleting(false)
            onDelete(message.id, attachments.map((attachment) => attachment.id))
          }}
        />
      )}
    </div>
  )
}

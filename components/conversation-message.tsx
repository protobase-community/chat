import { useState } from 'react'
import { ChatMessage, MentionedText } from '@protobase/ui'
import { DeleteMessageDialog } from './delete-message-dialog'
import type { Emoji } from './emoji'
import type { Message } from './message'
import { MessageActions } from './message-actions'
import { MessageEditor } from './message-editor'
import type { Person } from './people'
import { ReactionChips } from './reaction-chips'
import type { Reaction, ReactionGroup } from './reaction'

/** What the reader does to the thread's messages: edit and delete their own, react and take their reactions back. */
export type MessageHandlers = {
  onEdit: (messageId: number, body: string, mentions: string[]) => void
  onDelete: (messageId: number) => void
  onReact: (messageId: number, emoji: Emoji) => void
  onUnreact: (reaction: Reaction) => void
}

type Props = MessageHandlers & {
  message: Message
  continued: boolean
  mine: boolean
  reactions: readonly ReactionGroup[]
  member: (id: string) => Person | undefined
}

/**
 * One message under its author, or in a box to change it while its author edits it, with a footer of "(edited)" once
 * changed and its reactions, and what the reader can do to it in a bar shown while they point at it.
 */
export const ConversationMessage = ({ message, continued, mine, reactions, member, onEdit, onDelete, onReact, onUnreact }: Props) => {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const react = (emoji: Emoji) => onReact(message.id, emoji)
  const footer = (message.edited_at || reactions.length > 0) && (
    <span className="flex flex-wrap items-center gap-1">
      {message.edited_at && <span title={new Date(message.edited_at).toLocaleString()}>(edited)</span>}
      <ReactionChips groups={reactions} member={member} onReact={react} onUnreact={onUnreact} />
    </span>
  )
  return (
    <div className="group relative">
      {!editing && <MessageActions groups={reactions} onReact={react} onEdit={mine ? () => setEditing(true) : undefined} onDelete={mine ? () => setDeleting(true) : undefined} />}
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
          <MentionedText text={message.body} mentions={message.mentions.map((id) => ({ name: member(id)?.name }))} />
        )}
      </ChatMessage>
      {deleting && (
        <DeleteMessageDialog
          onClose={() => setDeleting(false)}
          onDelete={() => {
            setDeleting(false)
            onDelete(message.id)
          }}
        />
      )}
    </div>
  )
}

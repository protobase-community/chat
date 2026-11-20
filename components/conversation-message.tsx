import { useState, type RefObject } from 'react'
import { buttonClass, ChatMessage, MentionedText } from '@protobase/ui'
import { usePopoverMenu } from '@protobase/ui/unstable/primitives/popover-menu'
import { useToast } from '@protobase/ui/unstable/toasts/index'
import type { Attachment } from './attachment'
import { DeleteMessageDialog } from './delete-message-dialog'
import type { Emoji } from './emoji'
import type { Message } from './message'
import { MessageActions } from './message-actions'
import { MessageActionsMenu } from './message-actions-menu'
import { MessageAttachments } from './message-attachments'
import { MessageEditor } from './message-editor'
import type { Person } from './people'
import { ReactionChips } from './reaction-chips'
import { ThreadSummary } from './thread-summary'
import type { Reaction, ReactionGroup } from './reaction'
import { useMessagePress } from './use-message-press'

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
 * reader can do to it: in a bar shown while they point at it, or, by touch, in a menu a tap or long-press opens, which
 * also copies its text. A message with replies is not deleted, so nobody's replies go with it.
 */
export const ConversationMessage = ({ message, continued, mine, reactions, attachments, member, onEdit, onDelete, onReact, onUnreact, onOpenThread }: Props) => {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const actions = usePopoverMenu()
  const press = useMessagePress(() => actions.setOpen(true))
  const toast = useToast()
  const react = (emoji: Emoji) => onReact(message.id, emoji)
  const openThread = onOpenThread && (() => onOpenThread(message.id))
  const deletable = (mine || message.deletable) && message.reply_count === 0
  const edit = mine ? () => setEditing(true) : undefined
  const remove = deletable ? () => setDeleting(true) : undefined
  const author = member(message.author_id)?.name
  const title = mine ? 'Your message' : author ? `Message from ${author}` : 'Message'
  const showLabel = mine ? 'Show actions for your message' : author ? `Show actions for the message from ${author}` : 'Show actions for the message'
  const body = message.body
  const copy =
    body === null
      ? undefined
      : async () => {
          await navigator.clipboard.writeText(body)
          toast.show({ state: 'success', title: 'Text copied' })
        }
  const footer = (message.edited_at || reactions.length > 0) && (
    <span className="flex flex-wrap items-center gap-1">
      {message.edited_at && <span title={new Date(message.edited_at).toLocaleString()}>(edited)</span>}
      <ReactionChips groups={reactions} member={member} onReact={react} onUnreact={onUnreact} />
    </span>
  )
  return (
    <>
      <div
        ref={(element) => {
          // The menu a finger opens stands beside the whole message, as a menu beside its button.
          ;(actions.button as RefObject<HTMLElement | null>).current = element
        }}
        className={`group relative rounded-md [@media(hover:none)]:select-none [@media(hover:none)]:[-webkit-touch-callout:none] [&_a]:[-webkit-touch-callout:default] ${actions.open ? 'bg-muted' : ''}`}
        {...(editing ? {} : press)}
      >
        {!editing && <MessageActions groups={reactions} onReact={react} onReply={openThread} onEdit={edit} onDelete={remove} />}
        {!editing && (
          // On a touch screen, the way in for a screen reader or a keyboard, out of sight until it has the focus.
          <button
            type="button"
            className={`${buttonClass({ variant: 'secondary', size: 'sm' })} sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:right-0 focus-visible:top-0 [@media(hover:hover)]:hidden`}
            onClick={() => actions.setOpen(true)}
          >
            {showLabel}
          </button>
        )}
        <ChatMessage author={{ id: message.author_id, name: author }} time={message.sent_at} continued={continued} footer={footer}>
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
      </div>
      {deleting && (
        <DeleteMessageDialog
          onClose={() => setDeleting(false)}
          onDelete={() => {
            setDeleting(false)
            onDelete(message.id, attachments.map((attachment) => attachment.id))
          }}
        />
      )}
      <MessageActionsMenu
        open={actions.open && !editing}
        onClose={() => actions.setOpen(false)}
        place={actions.place}
        menu={actions.menu}
        title={title}
        preview={body ?? attachments[0]?.name}
        groups={reactions}
        onReact={react}
        onUnreact={onUnreact}
        onReply={openThread}
        onCopy={copy}
        onEdit={edit}
        onDelete={remove}
      />
    </>
  )
}

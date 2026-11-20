import { Button, ResponsiveDialog } from '@protobase/ui'
import { emojiLabels, emojiOrder, type Emoji } from './emoji'
import type { Reaction, ReactionGroup } from './reaction'

type Props = {
  onClose: () => void
  /** Names the message it acts on, such as "Message from Lena Fischer". */
  title: string
  /** The message's text, or its first file's name, shown under the title. */
  preview?: string
  groups: readonly ReactionGroup[]
  onReact: (emoji: Emoji) => void
  onUnreact: (reaction: Reaction) => void
  /** Given for a message of the conversation's flow, which a thread can start at. */
  onReply?: () => void
  /** Given for a message with text. */
  onCopy?: () => void
  /** Given for the reader's own message only. */
  onEdit?: () => void
  /** Given for a message the reader may delete, their own or anyone's to a moderator, while nobody replied to it. */
  onDelete?: () => void
}

/**
 * What the reader can do to a message, opened by a finger's tap or long-press on it, under a line of the message: a row
 * of every emoji, those they reacted with pressed, taking their reaction back as its chip does, then reply in its
 * thread, copy its text, edit their own message and delete one they may. A sheet from the bottom at mobile width, a
 * dialog on a wider touch screen. Each choice closes it.
 */
export const MessageActionsMenu = ({ onClose, title, preview, groups, onReact, onUnreact, onReply, onCopy, onEdit, onDelete }: Props) => {
  const mine = new Map(groups.flatMap((group) => (group.mine ? [[group.emoji, group.mine] as const] : [])))
  const choose = (onChoose: () => void) => () => {
    onClose()
    onChoose()
  }
  // The sheet stacks its buttons from the last up, and the dialog lines them up from the left: Delete leftmost there,
  // Reply in thread on top here.
  return (
    <ResponsiveDialog
      open
      title={title}
      description={preview && <span className="line-clamp-2">{preview}</span>}
      onClose={onClose}
      actions={
        <>
          {onDelete && (
            <Button variant="danger" onClick={choose(onDelete)}>
              Delete
            </Button>
          )}
          {onEdit && <Button onClick={choose(onEdit)}>Edit</Button>}
          {onCopy && <Button onClick={choose(onCopy)}>Copy text</Button>}
          {onReply && <Button onClick={choose(onReply)}>Reply in thread</Button>}
        </>
      }
    >
      <div role="group" aria-label="React" className="flex flex-wrap gap-1">
        {emojiOrder.map((emoji) => {
          const reaction = mine.get(emoji)
          return (
            <Button
              key={emoji}
              size="icon"
              variant={reaction ? 'secondary' : 'ghost'}
              aria-pressed={reaction !== undefined}
              aria-label={`React with ${emojiLabels[emoji].name}`}
              onClick={choose(() => (reaction ? onUnreact(reaction) : onReact(emoji)))}
            >
              <span aria-hidden>{emojiLabels[emoji].symbol}</span>
            </Button>
          )
        })}
      </div>
    </ResponsiveDialog>
  )
}

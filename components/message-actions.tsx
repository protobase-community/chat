import { Button } from '@protobase/ui'
import { emojiLabels, emojiOrder, type Emoji } from './emoji'
import type { ReactionGroup } from './reaction'

type Props = {
  groups: readonly ReactionGroup[]
  onReact: (emoji: Emoji) => void
  /** Given for the reader's own message only. */
  onEdit?: () => void
  onDelete?: () => void
}

/**
 * What the reader can do to a message, a bar over its top right corner shown while they point at it or move into it with
 * the keyboard, so it takes no room of its own: react with an emoji of the set they have not reacted with yet, and edit
 * or delete their own message.
 */
export const MessageActions = ({ groups, onReact, onEdit, onDelete }: Props) => {
  const reacted = new Set(groups.filter((group) => group.mine).map((group) => group.emoji))
  return (
    <div className="pointer-events-none absolute -top-3 right-0 flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5 opacity-0 shadow-sm transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
      {emojiOrder
        .filter((emoji) => !reacted.has(emoji))
        .map((emoji) => (
          <Button key={emoji} size="icon" variant="ghost" aria-label={`React with ${emojiLabels[emoji].name}`} title={emojiLabels[emoji].name} onClick={() => onReact(emoji)}>
            <span aria-hidden>{emojiLabels[emoji].symbol}</span>
          </Button>
        ))}
      {onEdit && (
        <Button size="sm" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
      )}
      {onDelete && (
        <Button size="sm" variant="ghost" onClick={onDelete}>
          Delete
        </Button>
      )}
    </div>
  )
}

import type { RefObject } from 'react'
import { Button, MenuSurface } from '@protobase/ui'
import { menuItemClass } from '@protobase/ui/unstable/primitives/menu-item'
import { emojiLabels, emojiOrder, type Emoji } from './emoji'
import type { Reaction, ReactionGroup } from './reaction'

type Props = {
  open: boolean
  onClose: () => void
  /** Where the menu was measured to stand beside the message, on a wider screen; undefined until then, or at mobile width. */
  place: { top: number; right: number; maxWidth: number } | undefined
  menu: RefObject<HTMLUListElement | null>
  /** Names the message it acts on, such as "Message from Lena Fischer". */
  title: string
  /** The message's text, or its first file's name, shown on one line under the title. */
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
 * thread, copy its text, edit their own message and delete one they may. A sheet from the bottom at mobile width, a menu
 * beside the message on a wider touch screen. Each choice closes it.
 */
export const MessageActionsMenu = ({ open, onClose, place, menu, title, preview, groups, onReact, onUnreact, onReply, onCopy, onEdit, onDelete }: Props) => {
  const mine = new Map(groups.flatMap((group) => (group.mine ? [[group.emoji, group.mine] as const] : [])))
  const item = (label: string, onChoose: () => void, danger = false) => (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        className={danger ? `${menuItemClass} text-danger-text` : menuItemClass}
        onClick={() => {
          onClose()
          onChoose()
        }}
      >
        {label}
      </button>
    </li>
  )
  return (
    <MenuSurface
      open={open}
      title={title}
      onClose={onClose}
      menu={
        <ul
          ref={menu}
          role="menu"
          aria-label={title}
          style={place ?? { visibility: 'hidden' }}
          className="fixed z-50 max-h-[calc(100dvh-1rem)] min-w-48 overflow-y-auto rounded-md border bg-background py-1 shadow-pop"
        >
          {preview && (
            <li role="none" className="truncate px-3 pb-2 pt-1 text-sm text-muted-foreground">
              {preview}
            </li>
          )}
          <li role="none">
            <div role="group" aria-label="React" className="flex flex-wrap gap-1 border-y px-3 py-2">
              {emojiOrder.map((emoji) => {
                const reaction = mine.get(emoji)
                return (
                  <Button
                    key={emoji}
                    size="icon"
                    variant={reaction ? 'secondary' : 'ghost'}
                    aria-pressed={reaction !== undefined}
                    aria-label={`React with ${emojiLabels[emoji].name}`}
                    onClick={() => {
                      onClose()
                      if (reaction) onUnreact(reaction)
                      else onReact(emoji)
                    }}
                  >
                    <span aria-hidden>{emojiLabels[emoji].symbol}</span>
                  </Button>
                )
              })}
            </div>
          </li>
          {onReply && item('Reply in thread', onReply)}
          {onCopy && item('Copy text', onCopy)}
          {onEdit && item('Edit', onEdit)}
          {onDelete && item('Delete', onDelete, true)}
        </ul>
      }
    />
  )
}

import { Button } from '@protobase/ui'
import { emojiLabels, type Emoji } from './emoji'
import type { Person } from './people'
import type { Reaction, ReactionGroup } from './reaction'

type Props = {
  groups: readonly ReactionGroup[]
  member: (id: string) => Person | undefined
  onReact: (emoji: Emoji) => void
  onUnreact: (reaction: Reaction) => void
}

/**
 * A message's reactions, one button per emoji with its count, naming who reacted on hover: the reader's own filled,
 * taking it back when pressed, and another's adding the reader's with the same emoji.
 */
export const ReactionChips = ({ groups, member, onReact, onUnreact }: Props) =>
  groups.map(({ emoji, count, userIds, mine }) => {
    const { symbol, name } = emojiLabels[emoji]
    const who = userIds.map((id) => member(id)?.name ?? 'Someone').join(', ')
    return (
      <Button
        key={emoji}
        size="sm"
        variant={mine ? 'primary' : 'secondary'}
        aria-pressed={mine !== undefined}
        aria-label={`${name}: ${who}`}
        title={who}
        onClick={() => (mine ? onUnreact(mine) : onReact(emoji))}
      >
        <span aria-hidden>{symbol}</span>
        <span>{count}</span>
      </Button>
    )
  })

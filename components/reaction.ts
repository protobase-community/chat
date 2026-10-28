import { emojiOrder, type Emoji } from './emoji'

/** A reaction as the chat page holds it, read from the reactions API. */
export type Reaction = { id: number; message_id: number; user_id: string; emoji: Emoji }

/** A record of the reactions API as a `Reaction`. */
export const toReaction = (record: Record<string, unknown>): Reaction => ({
  id: Number(record.id),
  message_id: Number(record.message_id),
  user_id: String(record.user_id),
  emoji: record.emoji as Emoji,
})

/** One emoji under a message: how many reacted with it, who, and the reader's own reaction with it, if any. */
export type ReactionGroup = { emoji: Emoji; count: number; userIds: string[]; mine?: Reaction }

/** A message's reactions per emoji, in the order of the set, each emoji someone reacted with once. */
export const reactionGroups = (reactions: readonly Reaction[], me: string): ReactionGroup[] =>
  emojiOrder.flatMap((emoji) => {
    const these = reactions.filter((reaction) => reaction.emoji === emoji)
    if (these.length === 0) return []
    return [{ emoji, count: these.length, userIds: these.map((reaction) => reaction.user_id), mine: these.find((reaction) => reaction.user_id === me) }]
  })

/** The reactions by the id of the message they answer. */
export const reactionsByMessage = (reactions: readonly Reaction[]) => {
  const byMessage = new Map<number, Reaction[]>()
  for (const reaction of reactions) byMessage.set(reaction.message_id, [...(byMessage.get(reaction.message_id) ?? []), reaction])
  return byMessage
}

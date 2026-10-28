/** The conversation a message is in, as telling people of it needs it. `memberIds` is null for a public channel. */
export type Conversation =
  | { kind: 'channel'; id: number; name: string; memberIds: string[] | null }
  | { kind: 'direct_message'; id: number; memberIds: string[] }

/**
 * Who a message tells, before who may read it is checked: the other members of a direct message and the people it
 * mentions, of a private channel or direct message only its members. Never its author, and each person once.
 */
export const toldOf = (message: { author_id: string; mentions: string[] }, conversation: Conversation) => {
  const people = conversation.kind === 'direct_message' ? [...conversation.memberIds, ...message.mentions] : message.mentions
  const members = conversation.memberIds
  return [...new Set(people)].filter((id) => id !== message.author_id && (members == null || members.includes(id)))
}

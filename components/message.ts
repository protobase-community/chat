/** A message as the chat page holds it, read from the messages API. */
export type Message = {
  id: number
  author_id: string
  body: string
  /** The user ids of the people it mentions. */
  mentions: string[]
  sent_at: string
}

/** A record of the messages API as a `Message`. */
export const toMessage = (record: Record<string, unknown>): Message => ({
  id: Number(record.id),
  author_id: String(record.author_id),
  body: String(record.body),
  mentions: Array.isArray(record.mentions) ? record.mentions.map(String) : [],
  sent_at: String(record.sent_at),
})

/** `current` with `incoming` added, each message once, in the order they were sent (their ids). */
export const mergeMessages = (current: Message[], incoming: Message[]) => {
  const byId = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

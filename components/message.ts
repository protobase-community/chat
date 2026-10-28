/** A message as the chat page holds it, read from the messages API. */
export type Message = {
  id: number
  author_id: string
  /** Null for a message of files alone. */
  body: string | null
  /** The user ids of the people it mentions. */
  mentions: string[]
  sent_at: string
  /** When its author last changed it, or null for a message never edited. */
  edited_at: string | null
}

/** A record of the messages API as a `Message`. */
export const toMessage = (record: Record<string, unknown>): Message => ({
  id: Number(record.id),
  author_id: String(record.author_id),
  body: record.body == null ? null : String(record.body),
  mentions: Array.isArray(record.mentions) ? record.mentions.map(String) : [],
  sent_at: String(record.sent_at),
  edited_at: record.edited_at == null ? null : String(record.edited_at),
})

/** `current` with `incoming` added, each message once, in the order they were sent (their ids). */
export const mergeMessages = (current: Message[], incoming: Message[]) => {
  const byId = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

/** `current` without the messages whose ids `gone` holds. */
export const dropMessages = (current: Message[], gone: ReadonlySet<number>) => current.filter((message) => !gone.has(message.id))

/** `current` with the messages it holds replaced by their versions in `incoming`; a message it no longer holds stays out. */
export const replaceMessages = (current: Message[], incoming: Message[]) => {
  const byId = new Map(incoming.map((message) => [message.id, message]))
  return current.map((message) => byId.get(message.id) ?? message)
}

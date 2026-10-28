/** A conversation messages are posted in: a channel or a direct message, by the message field that points at it. */
export type Conversation = { field: 'channel_id' | 'direct_message_id'; id: number }

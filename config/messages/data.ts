import { f, resource } from '@protobase/schema'

/** The most people one message mentions, as the comments' mentions allow. */
export const maxMentions = 20

/** Whether a message's mentions are what the composer gives: an array of at most `maxMentions` user ids. */
export const mentionIds = (mentions: unknown) =>
  Array.isArray(mentions) && mentions.length <= maxMentions && mentions.every((id) => typeof id === 'string' && id.length > 0)

/**
 * public.messages: what people say in a channel or a direct message, exactly one of them. A message is posted into, and
 * read in, only a conversation its reader may read, so a private one's messages stay with its members.
 */
export const messages = resource('messages')
  .table('messages')
  .fields({
    id: f.integer().readOnly().filterable().sortable().dbDefault(),
    organization_id: f.text().readOnly(),
    channel_id: f.relation('channels').optional().filterable(),
    direct_message_id: f.relation('direct_messages').optional().filterable(),
    author_id: f.text().readOnly().filterable(),
    body: f.text().min(1).max(10_000),
    // The user ids of the people the message mentions, as the composer gives them: a JSON array, `[]` for none.
    mentions: f.json().filterable(),
    sent_at: f.timestamp().readOnly().dbDefault(),
  })
  .primaryKey((r) => r.id)
  .tenant((r) => r.organization_id)
  .author((r) => r.author_id)
  .parent((r) => r.channel_id, 'read')
  .parent((r) => r.direct_message_id, 'read')
  .validate((message) => ((message.channel_id == null) === (message.direct_message_id == null) ? [{ field: 'channel_id', message: 'Post a message into a channel or a direct message, one of them' }] : undefined))
  .validate((message) => (mentionIds(message.mentions) ? undefined : [{ field: 'mentions', message: `Mention at most ${maxMentions} people, by their user ids` }]))
  // messages.created, which config/messages/notify.ts tells the people it mentions or writes to of.
  .events((e) => [e.created()])
  .live()

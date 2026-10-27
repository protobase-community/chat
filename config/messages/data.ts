import { f, resource } from '@protobase/schema'

/** The most people one message mentions, as the comments' mentions allow. */
export const maxMentions = 20

/** Whether a message's mentions are what the composer gives: an array of at most `maxMentions` user ids. */
export const mentionIds = (mentions: unknown) =>
  Array.isArray(mentions) && mentions.length <= maxMentions && mentions.every((id) => typeof id === 'string' && id.length > 0)

/** public.messages: what people say in a channel, posted only into a channel its author may read. */
export const messages = resource('messages')
  .table('messages')
  .fields({
    id: f.integer().readOnly().filterable().sortable().dbDefault(),
    organization_id: f.text().readOnly(),
    channel_id: f.relation('channels').filterable(),
    author_id: f.text().readOnly(),
    body: f.text().min(1).max(10_000),
    // The user ids of the people the message mentions, as the composer gives them: a JSON array, `[]` for none.
    mentions: f.json(),
    sent_at: f.timestamp().readOnly().dbDefault(),
  })
  .primaryKey((r) => r.id)
  .tenant((r) => r.organization_id)
  .author((r) => r.author_id)
  .parent((r) => r.channel_id, 'read')
  .validate((message) => (mentionIds(message.mentions) ? undefined : [{ field: 'mentions', message: `Mention at most ${maxMentions} people, by their user ids` }]))
  .live()

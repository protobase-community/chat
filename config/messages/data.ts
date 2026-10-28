import { f, resource, where, type AccessContext } from '@protobase/schema'
import { roles } from '../roles'

/** The most people one message mentions, as the comments' mentions allow. */
export const maxMentions = 20

/** Whether a message's mentions are what the composer gives: an array of at most `maxMentions` user ids. */
export const mentionIds = (mentions: unknown) =>
  Array.isArray(mentions) && mentions.length <= maxMentions && mentions.every((id) => typeof id === 'string' && id.length > 0)

/** The row filter of the signed-in person's own messages. */
const mine = (ctx: AccessContext) => where.eq('author_id', ctx.user!.id!)

/**
 * public.messages: what people say in a channel or a direct message, exactly one of them, in its flow or, with
 * `thread_id`, as a reply in the thread of one of its messages. A message is posted into, and read in, only a
 * conversation its reader may read, so a private one's messages and replies stay with its members. Only its author, the
 * superuser too, edits it, and it stays where it was posted; its author deletes it, and so does a workspace's moderator,
 * as long as nobody replied to it, which the database checks. Its files are its attachments.
 */
export const messages = resource('messages')
  .table('messages')
  .fields({
    id: f.integer().readOnly().filterable().sortable().dbDefault(),
    organization_id: f.text().readOnly(),
    channel_id: f.relation('channels').optional().filterable().access({ update: () => false }),
    direct_message_id: f.relation('direct_messages').optional().filterable().access({ update: () => false }),
    // For a reply, its thread's first message, a message of the same conversation's flow, which the database checks;
    // null for a message of the flow.
    thread_id: f.relation('messages').optional().filterable().access({ update: () => false }),
    author_id: f.text().readOnly().filterable(),
    // Null for a message of files alone; the database refuses a message with neither text nor files.
    body: f.text().min(1).max(10_000).optional(),
    // The user ids of the people the message mentions, as the composer gives them: a JSON array, `[]` for none.
    mentions: f.json().filterable(),
    sent_at: f.timestamp().readOnly().dbDefault(),
    // When its author last changed its body or mentions, set by the database; null for a message never edited.
    edited_at: f.timestamp().readOnly().optional(),
    // How many replies its thread has and when the last came, kept by the database; 0 and null for none.
    reply_count: f.integer().readOnly(),
    last_reply_at: f.timestamp().readOnly().optional(),
  })
  .primaryKey((r) => r.id)
  .tenant((r) => r.organization_id)
  .author((r) => r.author_id)
  // Whose a message is, for `messages.delete.own`: a participant deletes their own, a moderator any they read.
  .owner((r) => r.author_id)
  .parent((r) => r.channel_id, 'read')
  .parent((r) => r.direct_message_id, 'read')
  .validate((message) => ((message.channel_id == null) === (message.direct_message_id == null) ? [{ field: 'channel_id', message: 'Post a message into a channel or a direct message, one of them' }] : undefined))
  .validate((message) => (mentionIds(message.mentions) ? undefined : [{ field: 'mentions', message: `Mention at most ${maxMentions} people, by their user ids` }]))
  .access({
    update: roles.can('messages.update').and(mine),
    delete: roles.can('messages.delete'),
  })
  // messages.created, which config/messages/notify.ts tells the people it mentions or writes to of.
  .events((e) => [e.created()])
  .live()

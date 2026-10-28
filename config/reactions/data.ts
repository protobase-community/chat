import { f, resource, where, type AccessContext } from '@protobase/schema'
import { roles } from '../roles'

/** The emoji a message can be answered with, by name; the chat draws each from its own label. */
export const emojis = ['thumbs_up', 'heart', 'laugh', 'surprised', 'sad', 'party'] as const

/** The row filter of the signed-in person's own reactions. */
const mine = (ctx: AccessContext) => where.eq('user_id', ctx.user!.id!)

/**
 * public.reactions: one person's emoji under a message, added and read only by those who read the message, so a private
 * conversation's reactions stay with its members. Each person takes back only their own, the superuser too, and none
 * changes. Unique: (message_id, user_id, emoji); deleting the message deletes its reactions.
 */
export const reactions = resource('reactions')
  .table('reactions')
  .fields({
    id: f.integer().readOnly().filterable().sortable().dbDefault(),
    organization_id: f.text().readOnly(),
    message_id: f.relation('messages').filterable(),
    user_id: f.text().readOnly(),
    emoji: f.enum(emojis),
    created_at: f.timestamp().readOnly().dbDefault(),
  })
  .primaryKey((r) => r.id)
  .tenant((r) => r.organization_id)
  .author((r) => r.user_id)
  .parent((r) => r.message_id, 'read')
  .access({
    update: () => false,
    delete: roles.can('reactions.delete').and(mine),
  })
  .live()

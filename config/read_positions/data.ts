import { f, resource, where, type AccessContext } from '@protobase/schema'
import { roles } from '../roles'

/** The row filter of the signed-in person's own read positions. */
const mine = (ctx: AccessContext) => where.eq('user_id', ctx.user!.id!)

/**
 * public.read_positions: how far a person has read a channel or a direct message, exactly one of them, as the newest
 * message id they read to. Each person, the superuser too, reads and moves only their own, and only in a conversation
 * they read; the database keeps it from moving back. Unique: (user_id, channel_id) and (user_id, direct_message_id).
 */
export const readPositions = resource('read_positions')
  .table('read_positions')
  .fields({
    id: f.integer().readOnly().filterable().sortable().dbDefault(),
    organization_id: f.text().readOnly(),
    user_id: f.text().readOnly().filterable(),
    channel_id: f.relation('channels').optional().filterable().access({ update: () => false }),
    direct_message_id: f.relation('direct_messages').optional().filterable().access({ update: () => false }),
    last_read_id: f.integer().min(0),
  })
  .primaryKey((r) => r.id)
  .tenant((r) => r.organization_id)
  .author((r) => r.user_id)
  .parent((r) => r.channel_id, 'read')
  .parent((r) => r.direct_message_id, 'read')
  .validate((position) => ((position.channel_id == null) === (position.direct_message_id == null) ? [{ field: 'channel_id', message: 'A read position is of a channel or a direct message, one of them' }] : undefined))
  .access({
    read: roles.can('read_positions.read').and(mine),
    update: roles.can('read_positions.update').and(mine),
    delete: () => false,
  })
  .live()

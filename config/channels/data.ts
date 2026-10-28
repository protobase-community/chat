import { f, resource, where } from '@protobase/schema'
import { holdsMe, maxMembers, memberIds } from '../conversations/members'
import { roles } from '../roles'

/**
 * public.channels: a workspace's channels. Everyone in the workspace reads a public one; only its members a private one,
 * whose creator is its first member and adds or takes off the others. Unique: (organization_id, name) of public ones.
 */
export const channels = resource('channels')
  .table('channels')
  .fields({
    id: f.integer().readOnly().filterable().sortable().dbDefault(),
    organization_id: f.text().readOnly(),
    name: f.text().min(1).max(80).filterable().sortable(),
    topic: f.text().max(250).optional(),
    // Chosen when the channel starts, never changed: who already read a public channel would keep what they read.
    kind: f.enum(['public', 'private']).default('public').filterable().access({ update: () => false }),
    // A private channel's members, as user ids; the database adds its creator. Null for a public channel.
    member_ids: f.json().optional(),
    author_id: f.text().readOnly(),
    created_at: f.timestamp().readOnly().dbDefault(),
  })
  .primaryKey((r) => r.id)
  .tenant((r) => r.organization_id)
  .author((r) => r.author_id)
  .validate((channel) => {
    if (channel.kind === 'public' && channel.member_ids != null) return [{ field: 'member_ids', message: 'A public channel has no member list: everyone in the workspace reads it' }]
    if (channel.kind === 'private' && channel.member_ids != null && !memberIds(channel.member_ids)) {
      return [{ field: 'member_ids', message: `Pick at most ${maxMembers} members, by their user ids` }]
    }
    return
  })
  // Everyone, the superuser too, reads the public channels and the private ones they are a member of. Only a private
  // channel's creator changes it; the roles that update channels change public ones.
  .access({
    read: roles.can('channels.read').and((ctx) => where.or(where.eq('kind', 'public'), holdsMe(ctx))),
    update: roles
      .can('channels.update')
      .and(() => where.eq('kind', 'public'))
      .or((ctx) => where.and(where.eq('kind', 'private'), where.eq('author_id', ctx.user!.id))),
    delete: roles.can('channels.delete').and(() => where.eq('kind', 'public')),
  })
  .live()

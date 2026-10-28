import { f, resource } from '@protobase/schema'
import { holdsMe, maxMembers, memberIds } from '../conversations/members'
import { roles } from '../roles'

/**
 * public.direct_messages: a conversation between two or more people of a workspace, which only they read. Its starter
 * picks the others and the database adds the starter. One set of people has one: Unique (organization_id, member_key).
 */
export const directMessages = resource('direct_messages')
  .table('direct_messages')
  .fields({
    id: f.integer().readOnly().filterable().sortable().dbDefault(),
    organization_id: f.text().readOnly(),
    // The people in it, as user ids.
    member_ids: f.json(),
    // The sorted members the database derives for the unique key; the app reads member_ids instead.
    member_key: null,
    author_id: f.text().readOnly(),
    created_at: f.timestamp().readOnly().filterable().sortable().dbDefault(),
  })
  .primaryKey((r) => r.id)
  .tenant((r) => r.organization_id)
  .author((r) => r.author_id)
  .validate((conversation) => (memberIds(conversation.member_ids) ? undefined : [{ field: 'member_ids', message: `Pick at most ${maxMembers} people, by their user ids` }]))
  // Its members alone read it, the superuser too. Nobody changes or deletes one: its people are who it is between.
  .access({
    read: roles.can('direct_messages.read').and(holdsMe),
    update: () => false,
    delete: () => false,
  })
  .live()

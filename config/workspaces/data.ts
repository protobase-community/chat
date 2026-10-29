import { f, resource } from '@protobase/schema'
import { roles } from '../roles'

/**
 * public.workspaces: one record per workspace, keyed by its organization id, whose channel carries who of its members
 * is online or away (components/workspace-channel.ts). The tenant rule keeps each member to their own workspace's
 * record, so only its members join that channel. A member's page creates it the first time; nobody changes or deletes it.
 */
export const workspaces = resource('workspaces')
  .table('workspaces')
  .fields({
    organization_id: f.text().readOnly(),
    created_at: f.timestamp().readOnly().dbDefault(),
  })
  .primaryKey((r) => r.organization_id)
  .tenant((r) => r.organization_id)
  .access({
    read: roles.can('workspaces.read'),
    create: roles.can('workspaces.create'),
    update: () => false,
    delete: () => false,
  })

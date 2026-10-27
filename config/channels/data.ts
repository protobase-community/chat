import { f, resource } from '@protobase/schema'

/** public.channels: a workspace's channels, which every member of the workspace reads. Unique: (organization_id, name) */
export const channels = resource('channels')
  .table('channels')
  .fields({
    id: f.integer().readOnly().filterable().sortable().dbDefault(),
    organization_id: f.text().readOnly(),
    name: f.text().min(1).max(80).filterable().sortable(),
    topic: f.text().max(250).optional(),
    author_id: f.text().readOnly(),
    created_at: f.timestamp().readOnly().dbDefault(),
  })
  .primaryKey((r) => r.id)
  .tenant((r) => r.organization_id)
  .author((r) => r.author_id)
  .live()

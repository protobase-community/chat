import { f, resource } from '@protobase/schema'
import { imageSize } from '@protobase/server'
import { roles } from '../roles'
import { maxFileBytes } from './limits'

/**
 * public.attachments: a file shared in a message, stored with Protobase's private file storage. Only those who read the
 * message list it or get its download link, so a private conversation's files stay with its members; only the message's
 * author adds one, which the database's foreign key holds, and none changes. Its author, or a workspace's moderator,
 * takes it back, which the chat does only together with the message: the database keeps a message holding text or a
 * file. It is written and deleted with its message, so it is not live: the chat reads a message's files when the
 * message shows.
 */
export const attachments = resource('attachments')
  .table('attachments')
  .fields({
    id: f.integer().readOnly().filterable().sortable().dbDefault(),
    organization_id: f.text().readOnly(),
    message_id: f.relation('messages').filterable(),
    author_id: f.text().readOnly(),
    file: f.file().maxSize(maxFileBytes).derive({ width: imageSize('width'), height: imageSize('height') }),
    width: f.integer().readOnly().optional(),
    height: f.integer().readOnly().optional(),
    created_at: f.timestamp().readOnly().dbDefault(),
  })
  .primaryKey((r) => r.id)
  .tenant((r) => r.organization_id)
  .author((r) => r.author_id)
  // Whose a file is, for `attachments.delete.own`: a participant deletes their own, a moderator any they read.
  .owner((r) => r.author_id)
  .parent((r) => r.message_id, 'read')
  .access({
    update: () => false,
    delete: roles.can('attachments.delete'),
  })

import { view } from '@protobase/schema'
import type { attachments } from './data'

/** Files are shared and shown in their message on its conversation's page, so they have no sidebar entry. */
export const attachmentsView = view<typeof attachments>('attachments')
  .names({ singular: 'Attachment', plural: 'Attachments' })
  .nav({ hidden: true })

import { view } from '@protobase/schema'
import type { messages } from './data'

/** Messages are read and written on their channel's page, so they have no sidebar entry of their own. */
export const messagesView = view<typeof messages>('messages')
  .names({ singular: 'Message', plural: 'Messages' })
  .nav({ hidden: true })

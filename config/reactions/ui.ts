import { view } from '@protobase/schema'
import type { reactions } from './data'

/** Reactions are added and shown under their message on its conversation's page, so they have no sidebar entry. */
export const reactionsView = view<typeof reactions>('reactions')
  .names({ singular: 'Reaction', plural: 'Reactions' })
  .nav({ hidden: true })

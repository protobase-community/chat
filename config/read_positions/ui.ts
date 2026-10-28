import { view } from '@protobase/schema'
import type { readPositions } from './data'

/** Read positions are kept by the chat as its reader reads, so they have no sidebar entry of their own. */
export const readPositionsView = view<typeof readPositions>('read_positions')
  .names({ singular: 'Read position', plural: 'Read positions' })
  .nav({ hidden: true })

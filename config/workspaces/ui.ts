import { view } from '@protobase/schema'
import type { workspaces } from './data'

/** A workspace's record only carries its presence channel, so it has no sidebar entry of its own. */
export const workspacesView = view<typeof workspaces>('workspaces')
  .names({ singular: 'Workspace', plural: 'Workspaces' })
  .nav({ hidden: true })

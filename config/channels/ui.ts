import { view } from '@protobase/schema'
import type { channels } from './data'

/** The workspace's channels: a member opens one from the list, or starts one with a name and an optional topic. */
export const channelsView = view<typeof channels>('channels')
  .names({ singular: 'Channel', plural: 'Channels' })
  .title((r) => r.name)
  .fields((r) => ({ topic: r.topic.help('What the channel is for, shown under its name') }))
  .list((r) => ({ columns: [r.name, r.topic], sort: [[r.name, 'asc']] }))

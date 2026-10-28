import { component } from '@protobase/layout'
import { l, view } from '@protobase/schema'
import type { channels } from './data'

/** A channel's chat, drawn by components/channel-chat.tsx. */
const ChannelChat = component('ChannelChat')

/**
 * The workspace's channels, listed in the sidebar by name: a member opens one to chat in it, or starts one with a name
 * and an optional topic. A channel's page is its chat, read rather than a form, with Edit for its name and topic.
 */
export const channelsView = view<typeof channels>('channels')
  .names({ singular: 'Channel', plural: 'Channels' })
  .nav({ recent: { orderBy: 'name asc', limit: 20 } })
  .title((r) => r.name)
  .fields((r) => ({ topic: r.topic.help('What the channel is for, shown under its name') }))
  .list((r) => ({ columns: [r.name, r.topic], sort: [[r.name, 'asc']] }))
  .recordMode('read')
  .layout(() => [l.custom(ChannelChat)])

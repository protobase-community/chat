import { component } from '@protobase/layout'
import { l, view } from '@protobase/schema'
import type { channels } from './data'

/** A channel's chat, drawn by components/channel-chat.tsx. */
const ChannelChat = component('ChannelChat')

/**
 * The workspace's channels the reader may read, listed in the sidebar by name: a member opens one to chat in it, or
 * starts one with a name, an optional topic and whether it is private, with its members. A channel's page is its chat,
 * read rather than a form, under a private channel's members, with Edit for its name, topic and members.
 */
export const channelsView = view<typeof channels>('channels')
  .names({ singular: 'Channel', plural: 'Channels' })
  .nav({ recent: { orderBy: 'name asc', limit: 20 } })
  .title((r) => r.name)
  .fields((r) => ({
    topic: r.topic.help('What the channel is for, shown under its name'),
    kind: r.kind.label('Who reads it').valueLabels({ public: 'Everyone in the workspace', private: 'Its members only' }),
    member_ids: r.member_ids.label('Members').widget('members').help('Of a private channel: who reads it besides you', { when: 'editing' }),
  }))
  .list((r) => ({ columns: [r.name, r.topic, r.kind], sort: [[r.name, 'asc']] }))
  .recordMode('read')
  .layout((r) => [l.section('Members', [r.member_ids], { when: 'kind = "private"' }), l.custom(ChannelChat)])

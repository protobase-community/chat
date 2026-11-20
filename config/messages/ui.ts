import { l, view } from '@protobase/schema'
import type { messages } from './data'

/**
 * Messages are read and written on their conversation's page. The view makes them searchable: the top bar's search
 * finds them by their words, and the user menu's entry opens their list, every message the reader may read with where it
 * was written, newest first, with the list's search, for more results than the top bar shows. A message's page links to
 * its conversation.
 */
export const messagesView = view<typeof messages>('messages')
  .names({ singular: 'Message', plural: 'Messages' })
  .title((r) => r.body)
  .fields((r) => ({
    body: r.body.label('Message'),
    channel_id: r.channel_id.label('Channel'),
    direct_message_id: r.direct_message_id.label('Direct message'),
    thread_id: r.thread_id.label('In thread'),
    sent_at: r.sent_at.label('Sent'),
  }))
  .list((r) => ({ columns: [r.body, r.channel_id, r.direct_message_id, r.sent_at], sort: [[r.id, 'desc']], search: [r.body] }))
  // Messages are written in their conversation, never moved in or out as files.
  .import(false)
  .export(false)
  .recordMode('read')
  // Its page says what was written where and when, not the fields the chat keeps for itself, such as its mentions.
  // A thread's first message lists its replies, oldest first, as its thread reads.
  .layout((r) => [
    l.section('Message', [r.body, r.channel_id, r.direct_message_id, r.sent_at, r.thread_id]),
    l.related('Replies', { resource: 'messages', field: 'thread_id', sort: 'id asc', columns: ['body', 'sent_at'] }),
  ])
  .actions((a) => [
    a.link('open_channel', { label: 'Open channel', when: 'channel_id:*', to: { kind: 'record', resource: 'channels', key: '{{channel_id}}' } }),
    a.link('open_direct_message', { label: 'Open direct message', when: 'direct_message_id:*', to: { kind: 'record', resource: 'direct_messages', key: '{{direct_message_id}}' } }),
  ])

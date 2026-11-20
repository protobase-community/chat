import { component } from '@protobase/layout'
import { view } from '@protobase/schema'
import type { messages } from './data'

/** A message's record page, drawn by components/message-place.tsx: it opens the message in its conversation. */
const MessagePlace = component('MessagePlace')

/**
 * Messages are read and written on their conversation's page. The view makes them searchable: the top bar's search
 * finds them by their words, each result its author, kind and day over its text, and the user menu's entry opens their list,
 * every message the reader may read with where it was written, newest first, with the list's search, for more results than the top bar shows. A
 * message's page opens it where it was written, a reply in its thread.
 */
export const messagesView = view<typeof messages>('messages')
  .names({ singular: 'Message', plural: 'Messages' })
  .titleFrom('messageTitle', (r) => [r.author_id, r.channel_id, r.direct_message_id, r.thread_id, r.sent_at])
  .searchResult((r) => ({ subtitle: r.body }))
  .fields((r) => ({
    body: r.body.label('Message'),
    channel_id: r.channel_id.label('Channel'),
    direct_message_id: r.direct_message_id.label('Direct message'),
    sent_at: r.sent_at.label('Sent'),
  }))
  .list((r) => ({ columns: [r.body, r.channel_id, r.direct_message_id, r.sent_at], sort: [[r.id, 'desc']], search: [r.body] }))
  // Messages are written in their conversation, never moved in or out as files.
  .import(false)
  .export(false)
  .recordMode('read')
  .record({ component: MessagePlace })

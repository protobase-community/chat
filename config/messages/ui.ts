import { component } from '@protobase/layout'
import { view } from '@protobase/schema'
import type { messages } from './data'

/** A message's record page, drawn by components/message-place.tsx: it opens the message in its conversation. */
const MessagePlace = component('MessagePlace')

/**
 * Messages are read and written on their conversation's page. The view makes them searchable: the top bar's search
 * finds them by their words, each result its author's name over its text, and the user menu's entry opens their list,
 * every message the reader may read, newest first, with the list's search, for more results than the top bar shows. A
 * message's page opens it where it was written, a reply in its thread.
 */
export const messagesView = view<typeof messages>('messages')
  .names({ singular: 'Message', plural: 'Messages' })
  .titleFrom('authorName', (r) => [r.author_id])
  .searchResult((r) => ({ subtitle: r.body }))
  .fields((r) => ({
    author_id: r.author_id.label('From'),
    body: r.body.label('Message'),
    sent_at: r.sent_at.label('Sent'),
  }))
  .list((r) => ({ columns: [r.body, r.sent_at], sort: [[r.id, 'desc']], search: [r.body] }))
  // Messages are written in their conversation, never moved in or out as files.
  .import(false)
  .export(false)
  .recordMode('read')
  .record({ component: MessagePlace })

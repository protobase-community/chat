import { component } from '@protobase/layout'
import { view } from '@protobase/schema'
import type { directMessages } from './data'

/** A direct message's chat, its whole record page, drawn by components/direct-message-chat.tsx. */
const DirectMessageChat = component('DirectMessageChat')

/**
 * The reader's direct messages, listed in the sidebar under "Direct messages", each named after the other people in it
 * (the `memberNames` title of protobase.ui.tsx), with "New message" under them. New starts one with the people picked, or
 * opens the one they have; its page is its chat, filling the area, which links to its standard page with its people. One
 * with unread messages shows bold, with their count, and its tooltip says whether its people are online or away and
 * the status they set (the `directMessages` marks).
 */
export const directMessagesView = view<typeof directMessages>('direct_messages')
  .names({ singular: 'Message', plural: 'Direct messages' })
  .nav({ recent: { orderBy: 'created_at desc', limit: 20, marks: 'directMessages' }, create: { label: 'New message' } })
  .titleFrom('memberNames', (r) => [r.member_ids])
  .fields((r) => ({ member_ids: r.member_ids.label('People').widget('members').help('Who to talk to; you are in it too', { when: 'editing' }) }))
  .list((r) => ({ columns: [r.member_ids, r.created_at], sort: [[r.created_at, 'desc']] }))
  // A conversation is started by its people, not imported from a spreadsheet.
  .import(false)
  .recordMode('read')
  .record({ component: DirectMessageChat })

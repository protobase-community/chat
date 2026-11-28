import { view } from '@protobase/schema'
import { callFunctions } from '../conversations/call-address'
import { messagesConversation } from '../messages/conversation'
import type { directMessages } from './data'

/**
 * The reader's direct messages, listed in the sidebar under "Direct messages", each named after the other people in it
 * (Protobase's built-in `members` title), with "New message" under them. New starts one with the people picked, or
 * opens the one they have; its page is its chat, filling the area, which links to its standard page with its people. One
 * with unread messages shows bold, with their count, and a one-to-one one shows its other person's presence and status
 * beside its title, a group's in its tooltip (the `directMessages` marks).
 */
export const directMessagesView = view<typeof directMessages>('direct_messages')
  .names({ singular: 'Message', plural: 'Direct messages' })
  .nav({ recent: { orderBy: 'created_at desc', limit: 20, marks: 'directMessages' }, create: { label: 'New message' } })
  .titleFrom('members', (r) => [r.member_ids])
  .fields((r) => ({ member_ids: r.member_ids.label('People').widget('members').help('Who to talk to; you are in it too', { when: 'editing' }) }))
  .list((r) => ({ columns: [r.member_ids, r.created_at], sort: [[r.created_at, 'desc']] }))
  // A conversation is started by its people, not imported from a spreadsheet.
  .import(false)
  .recordMode('read')
  .record({
    conversation: {
      ...messagesConversation,
      field: 'direct_message_id',
      members: 'member_ids',
      readPosition: { resource: 'read_positions', field: 'direct_message_id', message: 'last_read_id' },
      call: callFunctions.direct_messages,
      placeholder: 'Write a message',
      empty: 'This is the start of your conversation.',
    },
  })

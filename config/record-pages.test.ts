import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { channels } from './channels/data'
import { channelsView } from './channels/ui'
import { directMessages } from './direct_messages/data'
import { directMessagesView } from './direct_messages/ui'

// A conversation page opens its call at the API function its `call` names, which a missing file would answer with 404.
describe('a conversation record page', () => {
  it.each([
    ['channels', channelsView.toModel(channels.toModel()).record, 'channel_id'],
    ['direct messages', directMessagesView.toModel(directMessages.toModel()).record, 'direct_message_id'],
  ])('of %s is the conversation of its messages, with a call function the app serves', (_, record, field) => {
    const conversation = record && 'conversation' in record ? record.conversation : undefined
    expect(conversation).toMatchObject({ resource: 'messages', field })
    expect(existsSync(new URL(`../functions/${conversation!.call}.ts`, import.meta.url))).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import * as ui from '../protobase.ui'
import { channels } from './channels/data'
import { channelsView } from './channels/ui'
import { directMessages } from './direct_messages/data'
import { directMessagesView } from './direct_messages/ui'
import { messages } from './messages/data'
import { messagesView } from './messages/ui'

// A record component whose name protobase.ui.tsx does not export silently falls back to the standard page.
describe('a conversation record page', () => {
  it.each([
    ['channels', channelsView.toModel(channels.toModel()).record],
    ['direct messages', directMessagesView.toModel(directMessages.toModel()).record],
  ])('of %s are a component protobase.ui.tsx exports', (_, record) => {
    const component = record && 'component' in record ? record.component : undefined
    expect(component).toBeDefined()
    expect(ui).toHaveProperty(component!)
  })
})

// A search result opens where the message was written: the first conversation its fields name.
describe('a message record page', () => {
  it('opens in its channel, else in its direct message, keyed by its own fields', () => {
    const opens = messagesView.toModel(messages.toModel()).recordOpens
    expect(opens).toEqual([
      { kind: 'record', resource: channels.toModel().name, key: '{{channel_id}}' },
      { kind: 'record', resource: directMessages.toModel().name, key: '{{direct_message_id}}' },
    ])
    expect(Object.keys(messages.toModel().fields)).toEqual(expect.arrayContaining(['channel_id', 'direct_message_id']))
  })
})

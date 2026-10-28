import { describe, expect, it } from 'vitest'
import * as ui from '../protobase.ui'
import { channels } from './channels/data'
import { channelsView } from './channels/ui'
import { directMessages } from './direct_messages/data'
import { directMessagesView } from './direct_messages/ui'

// A record component whose name protobase.ui.tsx does not export silently falls back to the standard page.
describe('a conversation record page', () => {
  it.each([
    ['channels', channelsView.toModel(channels.toModel()).record],
    ['direct messages', directMessagesView.toModel(directMessages.toModel()).record],
  ])('of %s are a component protobase.ui.tsx exports', (_, record) => {
    expect(record).toBeDefined()
    expect(ui).toHaveProperty(record!.component)
  })
})

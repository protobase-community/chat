import { describe, expect, it } from 'vitest'
import { conversationAddress, messageAddress, threadOfPanel } from './thread-address'

describe('conversationAddress', () => {
  it('is the conversation page, with the thread as its panel when given', () => {
    expect(conversationAddress({ field: 'channel_id', id: 3 })).toEqual({ kind: 'record', resource: 'channels', key: 3 })
    expect(conversationAddress({ field: 'direct_message_id', id: 5 }, 42)).toEqual({ kind: 'record', resource: 'direct_messages', key: 5, panel: 'thread-42' })
  })
})

describe('threadOfPanel', () => {
  it('reads the thread a panel names, and nothing else', () => {
    expect(threadOfPanel('thread-42')).toBe(42)
    expect(threadOfPanel(undefined)).toBeUndefined()
    expect(threadOfPanel('details')).toBeUndefined()
    expect(threadOfPanel('thread-')).toBeUndefined()
    expect(threadOfPanel('thread-x')).toBeUndefined()
    expect(threadOfPanel('thread--1')).toBeUndefined()
  })

  it('reads back what conversationAddress writes', () => {
    const address = conversationAddress({ field: 'channel_id', id: 3 }, 7)
    expect(address.kind === 'record' ? threadOfPanel(address.panel) : undefined).toBe(7)
  })
})

describe('messageAddress', () => {
  it('opens a message of the flow in its conversation', () => {
    expect(messageAddress({ id: 9, channel_id: 3, direct_message_id: null, thread_id: null })).toEqual({ kind: 'record', resource: 'channels', key: 3 })
  })

  it('opens a reply in its thread, beside its conversation', () => {
    expect(messageAddress({ id: 10, channel_id: null, direct_message_id: 5, thread_id: 9 })).toEqual({ kind: 'record', resource: 'direct_messages', key: 5, panel: 'thread-9' })
  })

  it('is nothing for a message of neither', () => {
    expect(messageAddress({ id: 11 })).toBeUndefined()
  })
})

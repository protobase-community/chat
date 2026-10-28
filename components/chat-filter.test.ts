import { describe, expect, it } from 'vitest'
import { chatFilter } from './chat-filter'

describe('chatFilter', () => {
  it('reads a conversation’s flow, its replies left out', () => {
    expect(chatFilter({ field: 'channel_id', id: 4 })).toBe('channel_id = 4 AND isNull(thread_id)')
    expect(chatFilter({ field: 'direct_message_id', id: 7 })).toBe('direct_message_id = 7 AND isNull(thread_id)')
  })

  it('reads a thread’s replies', () => {
    expect(chatFilter({ field: 'channel_id', id: 4 }, 12)).toBe('thread_id = 12')
  })
})

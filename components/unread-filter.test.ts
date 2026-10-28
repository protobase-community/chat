import { describe, expect, it } from 'vitest'
import { unreadFilter } from './unread-filter'

describe('unreadFilter', () => {
  it('reads each conversation after its read position, by others only', () => {
    expect(unreadFilter('channel_id', 'ana', [{ id: 1, lastReadId: 40 }, { id: 2, lastReadId: 0 }])).toBe(
      'author_id != "ana" AND ((channel_id = 1 AND id > 40) OR (channel_id = 2 AND id > 0))',
    )
  })

  it('keeps to the messages that mention the reader when asked', () => {
    expect(unreadFilter('direct_message_id', 'ana', [{ id: 7, lastReadId: 3 }], true)).toBe(
      'author_id != "ana" AND mentions:"ana" AND ((direct_message_id = 7 AND id > 3))',
    )
  })

  it('reads nothing for no conversations', () => {
    expect(unreadFilter('channel_id', 'ana', [])).toBeUndefined()
  })
})

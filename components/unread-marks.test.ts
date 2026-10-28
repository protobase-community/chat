import { describe, expect, it } from 'vitest'
import { unreadMarks } from './unread-marks'

describe('unreadMarks', () => {
  it('marks a channel with unread messages bold, with its unread mentions counted', () => {
    expect(unreadMarks({ 1: 4, 2: 1 }, { 1: 2 }, 'mentions')).toEqual({
      1: { strong: true, count: 2, label: '2 unread mentions' },
      2: { strong: true, label: 'Unread messages' },
    })
  })

  it('counts a direct message’s unread messages', () => {
    expect(unreadMarks({ 7: 1 }, { 7: 1 }, 'messages')).toEqual({ 7: { strong: true, count: 1, label: '1 unread message' } })
  })

  it('leaves a conversation with nothing unread unmarked', () => {
    expect(unreadMarks({ 3: 0 }, { 3: 0 }, 'mentions')).toEqual({})
    expect(unreadMarks({}, {}, 'messages')).toEqual({})
  })
})

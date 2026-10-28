import { describe, expect, it } from 'vitest'
import { lastReplyLabel, replyCountLabel } from './reply-labels'

describe('replyCountLabel', () => {
  it('counts one reply and several', () => {
    expect(replyCountLabel(1)).toBe('1 reply')
    expect(replyCountLabel(3)).toBe('3 replies')
  })
})

describe('lastReplyLabel', () => {
  it('names the day of the last reply and its time there', () => {
    const now = Date.parse('2026-10-28T15:00:00Z')
    expect(lastReplyLabel('2026-10-28T09:42:00Z', now, 'UTC')).toMatch(/^Last reply Today, 0?9:42/)
    expect(lastReplyLabel('2026-10-28T08:30:00Z', now, 'Europe/Amsterdam')).toMatch(/^Last reply Today, 0?9:30/)
    expect(lastReplyLabel('2026-10-27T09:42:00Z', now, 'UTC')).toMatch(/^Last reply Yesterday, /)
  })
})

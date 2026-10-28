import { describe, expect, it } from 'vitest'
import { firstUnreadId } from './first-unread'
import type { Message } from './message'

const message = (id: number, author_id: string): Message => ({ id, author_id, body: 'Hi', mentions: [], sent_at: '2026-10-28T10:00:00Z' })
const thread = [message(1, 'ben'), message(2, 'ana'), message(3, 'ben'), message(4, 'ben')]

describe('firstUnreadId', () => {
  it('is the first message after the read position', () => {
    expect(firstUnreadId(thread, 2, 'ana', false)).toBe(3)
  })

  it('passes over the reader’s own messages, which are never unread', () => {
    expect(firstUnreadId(thread, 1, 'ana', false)).toBe(3)
    expect(firstUnreadId([message(5, 'ana')], 0, 'ana', false)).toBeUndefined()
  })

  it('is none when everything is read', () => {
    expect(firstUnreadId(thread, 4, 'ana', false)).toBeUndefined()
  })

  it('is the first message of a conversation never opened', () => {
    expect(firstUnreadId(thread, 0, 'ana', false)).toBe(1)
  })

  it('is none when the first unread message may be among the earlier ones not loaded', () => {
    expect(firstUnreadId(thread, 0, 'ana', true)).toBeUndefined()
    expect(firstUnreadId(thread, 2, 'ana', true)).toBe(3)
  })
})

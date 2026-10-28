import { describe, expect, it } from 'vitest'
import { mergeMessages, type Message } from './message'
import { threadRows } from './thread-rows'

const message = (id: number, author_id: string, sent_at: string): Message => ({
  id,
  author_id,
  body: `Message ${id}`,
  mentions: [],
  sent_at,
  edited_at: null,
  thread_id: null,
  reply_count: 0,
  last_reply_at: null,
  deletable: false,
})

describe('threadRows', () => {
  it('groups one person’s messages of a few minutes', () => {
    const rows = threadRows([
      message(1, 'ana', '2026-10-27T09:00:00Z'),
      message(2, 'ana', '2026-10-27T09:04:00Z'),
      message(3, 'ben', '2026-10-27T09:05:00Z'),
      message(4, 'ana', '2026-10-27T09:06:00Z'),
      message(5, 'ana', '2026-10-27T09:20:00Z'),
    ])
    expect(rows.map((row) => row.continued)).toEqual([false, true, false, false, false])
  })

  it('puts a day divider above the first message and each new day’s first, which starts a group again', () => {
    const rows = threadRows([
      message(1, 'ana', '2026-10-26T12:00:00Z'),
      message(2, 'ana', '2026-10-26T12:01:00Z'),
      message(3, 'ana', '2026-10-28T12:02:00Z'),
    ])
    expect(rows.map((row) => [row.newDay, row.continued])).toEqual([[true, false], [false, true], [true, false]])
  })
})

describe('mergeMessages', () => {
  it('keeps each message once, in the order they were sent', () => {
    const merged = mergeMessages([message(2, 'ana', 'b'), message(3, 'ana', 'c')], [message(3, 'ana', 'c'), message(1, 'ben', 'a'), message(4, 'ben', 'd')])
    expect(merged.map((each) => each.id)).toEqual([1, 2, 3, 4])
  })
})

describe('threadRows of a thread’s replies', () => {
  it('puts no day divider above replies of the day their thread’s first message shows', () => {
    const replies = [message(2, 'ben', '2026-10-27T10:00:00Z'), message(3, 'ana', '2026-10-28T09:00:00Z')]
    expect(threadRows(replies, '2026-10-27T09:00:00Z').map((row) => row.newDay)).toEqual([false, true])
    expect(threadRows(replies, '2026-10-26T09:00:00Z').map((row) => row.newDay)).toEqual([true, true])
  })
})

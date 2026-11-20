import { describe, expect, it } from 'vitest'
import { messageTitle, sentDay } from './message-title'

const people = new Map([['u1', { id: 'u1', name: 'Lena Fischer' }]])
const as = (id: string) => ({ user: { id } as never, member: (key: string) => people.get(key) as never })
const now = new Date('2026-11-20T12:00:00Z')

describe('messageTitle', () => {
  it('says who wrote it, what kind of message it is and the day', () => {
    expect(messageTitle({ author_id: 'u1', channel_id: 1, thread_id: null, sent_at: '2026-11-03T09:50:00Z' }, as('u2'), now)).toBe('Lena Fischer · channel message · 3 Nov')
    expect(messageTitle({ author_id: 'u1', channel_id: 1, thread_id: 6, sent_at: '2026-11-03T09:50:00Z' }, as('u2'), now)).toBe('Lena Fischer · thread reply · 3 Nov')
    expect(messageTitle({ author_id: 'u1', direct_message_id: 2, thread_id: null, sent_at: '2025-10-28T09:50:00Z' }, as('u2'), now)).toBe('Lena Fischer · direct message · 28 Oct 2025')
  })

  it('names the reader "You"', () => {
    expect(messageTitle({ author_id: 'u1', channel_id: 1, sent_at: '2026-11-03T09:50:00Z' }, as('u1'), now)).toBe('You · channel message · 3 Nov')
  })

  it('gives no title while the author is not known, so the record shows its key', () => {
    expect(messageTitle({ author_id: 'newcomer', channel_id: 1 }, as('u1'), now)).toBeUndefined()
  })
})

describe('sentDay', () => {
  it('is nothing for a time it cannot read', () => {
    expect(sentDay(undefined, now)).toBeUndefined()
  })
})

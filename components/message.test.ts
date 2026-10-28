import { describe, expect, it } from 'vitest'
import { dropMessages, mergeMessages, replaceMessages, toMessage, type Message } from './message'

const message = (id: number, body = `Message ${id}`): Message => ({ id, author_id: 'ana', body, mentions: [], sent_at: '2026-10-28T09:00:00Z', edited_at: null })

describe('toMessage', () => {
  it('keeps when a message was edited, and null for one never edited', () => {
    const record = { id: 1, author_id: 'ana', body: 'Hi', mentions: [], sent_at: '2026-10-28T09:00:00Z' }
    expect(toMessage({ ...record, edited_at: '2026-10-28T09:05:00Z' }).edited_at).toBe('2026-10-28T09:05:00Z')
    expect(toMessage({ ...record, edited_at: null }).edited_at).toBeNull()
  })
})

describe('mergeMessages', () => {
  it('adds each message once, in the order they were sent', () => {
    expect(mergeMessages([message(1), message(3)], [message(2), message(3, 'Again')]).map((each) => each.id)).toEqual([1, 2, 3])
  })
})

describe('replaceMessages', () => {
  it('replaces the messages held and adds none', () => {
    expect(replaceMessages([message(1), message(2)], [message(2, 'Edited'), message(5)])).toEqual([message(1), message(2, 'Edited')])
  })
})

describe('dropMessages', () => {
  it('takes out the messages deleted', () => {
    expect(dropMessages([message(1), message(2), message(3)], new Set([2, 9]))).toEqual([message(1), message(3)])
  })
})

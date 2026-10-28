import { describe, expect, it } from 'vitest'
import { excerpt, excerptLength, notificationOf } from './notification'

describe('notificationOf', () => {
  it('names the sender and the channel, and opens the channel', () => {
    const notification = notificationOf({ sender: 'Maya Jansen', body: 'Ready, @Sam Okafor?' }, { kind: 'channel', id: 4, name: 'launch', memberIds: null }, 'https://chat.example.com')
    expect(notification).toEqual({ title: 'Maya Jansen mentioned you in #launch', body: 'Ready, @Sam Okafor?', url: 'https://chat.example.com/channels/4' })
  })

  it('names the sender of a direct message, and opens it', () => {
    const notification = notificationOf({ sender: 'Sam Okafor', body: 'Lunch?' }, { kind: 'direct_message', id: 7, memberIds: ['maya', 'sam'] }, 'http://localhost:5173')
    expect(notification).toEqual({ title: 'Sam Okafor sent you a direct message', body: 'Lunch?', url: 'http://localhost:5173/direct_messages/7' })
  })
})

describe('excerpt', () => {
  it('keeps a short message on one line', () => {
    expect(excerpt('  Hello\n\nthere  ')).toBe('Hello there')
  })

  it('cuts a long one to its start, never inside a character', () => {
    const long = excerpt('👋'.repeat(excerptLength + 5))
    expect(Array.from(long)).toHaveLength(excerptLength)
    expect(long.endsWith('👋…')).toBe(true)
  })
})

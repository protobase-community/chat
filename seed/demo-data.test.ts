import { describe, expect, it } from 'vitest'
import { channels, messages, people, sentAt } from './demo-data'

describe('the demo conversation', () => {
  const today = new Date('2026-10-27T15:00:00Z')

  it('runs over yesterday and today, in the order it was sent', () => {
    const times = messages.map((message) => sentAt(message, today))
    expect(times).toEqual([...times].sort())
    expect(new Set(times.map((time) => time.slice(0, 10)))).toEqual(new Set(['2026-10-26', '2026-10-27']))
  })

  it('happens in #general and #random', () => {
    expect(new Set(messages.map((message) => message.channel))).toEqual(new Set(channels.map((channel) => channel.name)))
  })

  it('writes each mention as @ and the name of a person it lists', () => {
    for (const message of messages) {
      for (const person of message.mentions ?? []) expect(message.body).toContain(`@${people[person].name}`)
    }
    expect(messages.some((message) => message.mentions?.length)).toBe(true)
  })
})

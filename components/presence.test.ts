import { describe, expect, it } from 'vitest'
import { idleAfterMs, pageActivity, peopleActivity } from './presence'

describe('pageActivity', () => {
  it('is online while the page shows and was used within the idle time', () => {
    expect(pageActivity({ visible: true, lastUsedAt: 0 }, idleAfterMs - 1)).toBe('online')
  })

  it('is away once the page was idle for the idle time', () => {
    expect(pageActivity({ visible: true, lastUsedAt: 0 }, idleAfterMs)).toBe('away')
  })

  it('is away while the page is hidden, however recently it was used', () => {
    expect(pageActivity({ visible: false, lastUsedAt: 0 }, 0)).toBe('away')
  })
})

describe('peopleActivity', () => {
  it('counts several pages of one person as one, online when any page is', () => {
    const people = peopleActivity([
      { user: 'maya', state: { activity: 'away' } },
      { user: 'maya', state: { activity: 'online' } },
      { user: 'maya', state: { activity: 'away' } },
      { user: 'sam', state: { activity: 'away' } },
    ])
    expect(Object.fromEntries(people)).toEqual({ maya: 'online', sam: 'away' })
  })

  it('leaves out visitors and states that are no activity', () => {
    const people = peopleActivity([
      { user: null, state: { activity: 'online' } },
      { user: 'lena', state: { activity: 'busy' } },
      { user: 'lena', state: 'online' },
    ])
    expect(people.size).toBe(0)
  })
})

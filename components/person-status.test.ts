import { describe, expect, it } from 'vitest'
import { groupLabel, personLabel } from './person-status'

const lunch = { availability: 'busy' as const, text: 'Having lunch', clearsAt: '2026-10-29T12:00:00Z' }
const noon = Date.parse('2026-10-29T12:00:00Z')

describe('personLabel', () => {
  it('names the activity, the availability and the text', () => {
    expect(personLabel('online', lunch, noon - 1)).toBe('Online, Busy, Having lunch')
    expect(personLabel('away', { availability: 'do_not_disturb', text: null, clearsAt: null }, noon)).toBe('Away, Do not disturb')
  })

  it('leaves out a status whose clear time has passed, and an automatic availability', () => {
    expect(personLabel('online', lunch, noon)).toBe('Online')
    expect(personLabel(undefined, { availability: 'automatic', text: 'On vacation', clearsAt: null }, noon)).toBe('On vacation')
  })

  it('says nothing of someone with no page open and no status', () => {
    expect(personLabel(undefined, undefined, noon)).toBeUndefined()
  })
})

describe('groupLabel', () => {
  it('names each of several people with what is known of them', () => {
    const others = [
      { name: 'Sam Okafor', activity: 'online' as const, status: undefined },
      { name: 'Lena Novak', activity: undefined, status: undefined },
      { name: 'Maya Jansen', activity: 'away' as const, status: { availability: 'automatic' as const, text: 'On vacation', clearsAt: null } },
    ]
    expect(groupLabel(others, noon)).toBe('Sam Okafor: Online; Maya Jansen: Away, On vacation')
  })

  it('says nothing when nobody has an activity or a status', () => {
    expect(groupLabel([{ name: 'Lena Novak', activity: undefined, status: undefined }], noon)).toBeUndefined()
  })
})

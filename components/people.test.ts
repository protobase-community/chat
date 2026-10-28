import { describe, expect, it } from 'vitest'
import { mentionLimit, peopleMatching } from './people'

const people = [
  { id: 'u1', name: 'Maya Jansen' },
  { id: 'u2', name: 'Sam Okafor' },
  { id: 'u3', name: 'Lena Novak' },
]

describe('peopleMatching', () => {
  it('finds people by any part of their name, ignoring case', () => {
    expect(peopleMatching(people, 'NOV').map((person) => person.id)).toEqual(['u3'])
    expect(peopleMatching(people, 'a').map((person) => person.id)).toEqual(['u1', 'u2', 'u3'])
  })

  it('lists everyone for an empty query, at most the limit', () => {
    const many = Array.from({ length: 20 }, (_, index) => ({ id: `u${index}`, name: `Person ${index}` }))
    expect(peopleMatching(many, '')).toHaveLength(mentionLimit)
  })

  it('finds nobody when no name matches', () => {
    expect(peopleMatching(people, 'zed')).toEqual([])
  })
})

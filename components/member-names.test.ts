import { describe, expect, it } from 'vitest'
import { memberNames } from './member-names'

const people = new Map([
  ['u1', { id: 'u1', name: 'Maya Jansen' }],
  ['u2', { id: 'u2', name: 'Sam Okafor' }],
  ['u3', { id: 'u3', name: 'Lena Fischer' }],
])
const as = (id: string) => ({ user: { id } as never, member: (key: string) => people.get(key) })

describe('memberNames', () => {
  it('names a conversation after the people in it other than the reader', () => {
    const record = { member_ids: ['u1', 'u2'] }
    expect(memberNames(record, as('u1'))).toBe('Sam Okafor')
    expect(memberNames(record, as('u2'))).toBe('Maya Jansen')
    expect(memberNames({ member_ids: ['u2', 'u1', 'u3'] }, as('u1'))).toBe('Sam Okafor, Lena Fischer')
  })

  it('gives no title while a name is not known, so the record shows its key', () => {
    expect(memberNames({ member_ids: ['u1', 'newcomer'] }, as('u1'))).toBeUndefined()
    expect(memberNames({ member_ids: ['u1'] }, as('u1'))).toBeUndefined()
    expect(memberNames({}, as('u1'))).toBeUndefined()
  })
})

import { describe, expect, it } from 'vitest'
import { authorName } from './author-name'

const people = new Map([['u1', { id: 'u1', name: 'Maya Jansen' }]])
const reader = { member: (key: string) => people.get(key) as never }

describe('authorName', () => {
  it('titles a message by its author', () => {
    expect(authorName({ author_id: 'u1' }, reader)).toBe('Maya Jansen')
  })

  it('gives no title while the author is not known, so the record shows its key', () => {
    expect(authorName({ author_id: 'newcomer' }, reader)).toBeUndefined()
  })
})

import { describe, expect, it } from 'vitest'
import { scheduledDelete } from './file-deletes'

describe('the scheduled delete of a stored file', () => {
  const due = new Date('2026-10-28T12:00:00Z')

  it('names its provider and path, without the query', () => {
    expect(scheduledDelete('private:demo/2992db9c.png?name=bike.png&size=48211', due)).toEqual({ provider: 'private', path: 'demo/2992db9c.png', due })
  })

  it('names its image variants, stored beside it', () => {
    expect(scheduledDelete('private:demo/a.jpg?name=a.jpg&variants=card.webp,thumb.avif', due)).toEqual({
      provider: 'private',
      path: 'demo/a.jpg',
      due,
      variants: ['demo/a.jpg.card.webp', 'demo/a.jpg.thumb.avif'],
    })
  })

  it('refuses a value that is no stored file', () => {
    expect(() => scheduledDelete('not a file', due)).toThrow(/is not a stored file/)
  })
})

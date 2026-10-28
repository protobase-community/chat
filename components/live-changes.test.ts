import { describe, expect, it } from 'vitest'
import { changesOf } from './live-changes'

describe('changesOf', () => {
  it('sorts one resource’s changes into created, updated and deleted keys', () => {
    const changes = changesOf(
      [
        { resource: 'messages', key: '3', operation: 'update' },
        { resource: 'messages', key: '4', operation: 'delete' },
        { resource: 'reactions', key: '9', operation: 'create' },
        { resource: 'messages', key: '3', operation: 'update' },
      ],
      'messages',
    )
    expect(changes).toEqual({ created: false, updated: new Set([3]), deleted: new Set([4]) })
  })

  it('counts an undelete as a create', () => {
    expect(changesOf([{ resource: 'messages', key: '5', operation: 'undelete' }], 'messages').created).toBe(true)
  })
})

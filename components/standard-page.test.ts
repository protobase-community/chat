import { describe, expect, it } from 'vitest'
import type { ResourceModel } from '@protobase/schema'
import { standardPage } from './standard-page'

describe('standardPage', () => {
  it("is the open conversation's record page as standard", () => {
    const model = { name: 'direct_messages' } as ResourceModel
    expect(standardPage({ model, key: '7' })).toEqual({ kind: 'record', resource: 'direct_messages', key: '7', standard: true })
  })
})

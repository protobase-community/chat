import { describe, expect, it } from 'vitest'
import { callUrl, conversationOfCall } from './call-address'

const parse = (path: string) => conversationOfCall(new URL(path, 'http://chat.test'))

describe('a conversation call address', () => {
  it('names the conversation it was made for', () => {
    expect(parse(callUrl('channels', '7'))).toEqual({ resource: 'channels', key: '7' })
    expect(parse(callUrl('direct_messages', '12'))).toEqual({ resource: 'direct_messages', key: '12' })
  })

  it('names nothing for a resource without calls, or without a key', () => {
    expect(parse(callUrl('messages', '7'))).toBeUndefined()
    expect(parse(callUrl('channels', ''))).toBeUndefined()
    expect(parse('/api/functions/call')).toBeUndefined()
  })
})

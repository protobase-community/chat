import { describe, expect, it } from 'vitest'
import { callUrl, keyOfCall } from './call-address'

const parse = (path: string) => keyOfCall(new URL(path, 'http://chat.test'))

describe('a conversation call address', () => {
  it("opens its resource's call function with the conversation's key", () => {
    expect(callUrl('channels', '7')).toBe('/api/functions/channel-call?key=7')
    expect(callUrl('direct_messages', '12')).toBe('/api/functions/direct-message-call?key=12')
  })

  it('names the key it was made for, and none without one', () => {
    expect(parse(callUrl('channels', '7'))).toBe('7')
    expect(parse(callUrl('channels', ''))).toBeUndefined()
    expect(parse('/api/functions/channel-call')).toBeUndefined()
  })
})

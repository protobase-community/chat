import { describe, expect, it } from 'vitest'
import { toldOf, type Conversation } from './told-of'

const general: Conversation = { kind: 'channel', id: 1, name: 'general', memberIds: null }
const launch: Conversation = { kind: 'channel', id: 2, name: 'launch', memberIds: ['maya', 'sam'] }
const direct: Conversation = { kind: 'direct_message', id: 3, memberIds: ['maya', 'sam', 'lena'] }

describe('toldOf', () => {
  it('tells everyone a channel message mentions, and not its author', () => {
    expect(toldOf({ author_id: 'maya', mentions: ['sam', 'lena', 'maya'] }, general)).toEqual(['sam', 'lena'])
  })

  it('tells nobody of a channel message that mentions nobody', () => {
    expect(toldOf({ author_id: 'maya', mentions: [] }, general)).toEqual([])
  })

  it('tells only the members of a private channel it mentions', () => {
    expect(toldOf({ author_id: 'maya', mentions: ['lena'] }, launch)).toEqual([])
    expect(toldOf({ author_id: 'maya', mentions: ['sam', 'lena'] }, launch)).toEqual(['sam'])
  })

  it('tells the other members of a direct message, each once, and nobody outside it', () => {
    expect(toldOf({ author_id: 'sam', mentions: ['lena', 'dan'] }, direct)).toEqual(['maya', 'lena'])
  })
})

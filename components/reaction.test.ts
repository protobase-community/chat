import { describe, expect, it } from 'vitest'
import { reactionGroups, reactionsByMessage, toReaction, type Reaction } from './reaction'

const reaction = (id: number, user_id: string, emoji: Reaction['emoji']): Reaction => ({ id, message_id: 1, user_id, emoji })

describe('reactionGroups', () => {
  it('counts each emoji once, in the order of the set, with who reacted and the reader’s own', () => {
    const groups = reactionGroups([reaction(1, 'ben', 'party'), reaction(2, 'ana', 'thumbs_up'), reaction(3, 'ben', 'thumbs_up')], 'ben')
    expect(groups).toEqual([
      { emoji: 'thumbs_up', count: 2, userIds: ['ana', 'ben'], mine: reaction(3, 'ben', 'thumbs_up') },
      { emoji: 'party', count: 1, userIds: ['ben'], mine: reaction(1, 'ben', 'party') },
    ])
  })

  it('leaves the reader’s own out where they did not react', () => {
    expect(reactionGroups([reaction(1, 'ana', 'heart')], 'ben')[0]!.mine).toBeUndefined()
  })

  it('is empty for a message nobody reacted to', () => {
    expect(reactionGroups([], 'ben')).toEqual([])
  })
})

describe('toReaction', () => {
  it('reads a record of the API', () => {
    expect(toReaction({ id: '4', message_id: 7, user_id: 'ana', emoji: 'sad' })).toEqual({ id: 4, message_id: 7, user_id: 'ana', emoji: 'sad' })
  })
})

describe('reactionsByMessage', () => {
  it('groups the reactions by the message they answer', () => {
    const one = { id: 1, message_id: 7, user_id: 'ana', emoji: 'sad' } as const
    const two = { id: 2, message_id: 8, user_id: 'ana', emoji: 'sad' } as const
    const three = { id: 3, message_id: 7, user_id: 'ben', emoji: 'heart' } as const
    expect(reactionsByMessage([one, two, three])).toEqual(new Map([[7, [one, three]], [8, [two]]]))
  })
})

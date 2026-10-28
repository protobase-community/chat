import type { emojis } from '../config/reactions/data'

/** An emoji a message can be answered with, by the name a reaction stores. */
export type Emoji = (typeof emojis)[number]

/** Each emoji as it is drawn and as a screen reader names it. */
export const emojiLabels: Record<Emoji, { symbol: string; name: string }> = {
  thumbs_up: { symbol: '👍', name: 'Thumbs up' },
  heart: { symbol: '❤️', name: 'Heart' },
  laugh: { symbol: '😂', name: 'Laughing' },
  surprised: { symbol: '😮', name: 'Surprised' },
  sad: { symbol: '😢', name: 'Sad' },
  party: { symbol: '🎉', name: 'Party' },
}

/** The emoji in the order the chat offers and shows them. */
export const emojiOrder = Object.keys(emojiLabels) as Emoji[]

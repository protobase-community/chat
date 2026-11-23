import type { emojis } from './data'

/** Each emoji a message can be answered with, by the name a reaction stores, as it is drawn and as a screen reader names it. */
export const emojiLabels: Record<(typeof emojis)[number], { symbol: string; name: string }> = {
  thumbs_up: { symbol: '👍', name: 'Thumbs up' },
  heart: { symbol: '❤️', name: 'Heart' },
  laugh: { symbol: '😂', name: 'Laughing' },
  surprised: { symbol: '😮', name: 'Surprised' },
  sad: { symbol: '😢', name: 'Sad' },
  party: { symbol: '🎉', name: 'Party' },
}

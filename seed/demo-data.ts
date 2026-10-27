// The demo workspace the seed writes: three people, #general and #random, and a short conversation over yesterday and
// today. A message names its author and the people it mentions by their key in `people`; `@Name` in its text is how
// the chat shows a mention.

export const workspace = { name: 'Demo workspace', slug: 'demo' }

export const people = {
  maya: { email: 'maya@example.com', name: 'Maya Jansen' },
  sam: { email: 'sam@example.com', name: 'Sam Okafor' },
  lena: { email: 'lena@example.com', name: 'Lena Fischer' },
} as const

export type Person = keyof typeof people

/** Maya starts the workspace and its channels; the others join as participants. */
export const owner: Person = 'maya'

export const channels = [
  { name: 'general', topic: 'Announcements and everything about the team' },
  { name: 'random', topic: 'Everything else' },
] as const

export type DemoMessage = {
  channel: (typeof channels)[number]['name']
  author: Person
  /** Days before today, 0 for today. */
  day: number
  /** The time of day, as HH:MM in UTC. */
  at: string
  body: string
  mentions?: Person[]
}

export const messages: DemoMessage[] = [
  { channel: 'general', author: 'maya', day: 1, at: '08:55', body: 'Morning all! This is our new team chat.' },
  { channel: 'general', author: 'maya', day: 1, at: '08:56', body: 'Channels are in the sidebar, and #random is for everything else.' },
  { channel: 'general', author: 'sam', day: 1, at: '09:12', body: 'Nice, much better than the long email threads.' },
  { channel: 'general', author: 'lena', day: 1, at: '09:30', body: '@Sam Okafor did the release notes go out yesterday?', mentions: ['sam'] },
  { channel: 'general', author: 'sam', day: 1, at: '09:34', body: 'Not yet, I will send them after lunch.' },
  { channel: 'random', author: 'lena', day: 1, at: '12:05', body: 'Anyone up for lunch at the market?' },
  { channel: 'random', author: 'maya', day: 1, at: '12:07', body: 'Count me in.' },
  { channel: 'general', author: 'sam', day: 0, at: '08:41', body: 'The release notes are out.\nThanks for the reminder, Lena.' },
  { channel: 'general', author: 'maya', day: 0, at: '09:02', body: '@Lena Fischer @Sam Okafor stand-up moves to 10:00 today.', mentions: ['lena', 'sam'] },
  { channel: 'general', author: 'lena', day: 0, at: '09:03', body: 'Works for me.' },
  { channel: 'random', author: 'sam', day: 0, at: '10:30', body: 'Coffee machine on the second floor is fixed.' },
]

/** When a demo message was sent, from the day the seed runs. */
export const sentAt = (message: DemoMessage, today: Date) => {
  const [hours, minutes] = message.at.split(':').map(Number)
  const sent = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - message.day, hours, minutes))
  return sent.toISOString()
}

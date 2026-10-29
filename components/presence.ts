/** How long a page counts as in use after its last click, key or scroll: past it, a page left open is away. */
export const idleAfterMs = 10 * 60_000

/** Where one page, or one person, stands: `online` while a page of theirs shows and is in use, else `away`. */
export type Activity = 'online' | 'away'

/** Where a page stands, from whether it shows and when it was last used. */
export const pageActivity = (page: { visible: boolean; lastUsedAt: number }, now: number): Activity =>
  page.visible && now - page.lastUsedAt < idleAfterMs ? 'online' : 'away'

/** What a page tracks on its workspace's presence channel. */
export type PresenceState = { activity: Activity }

const activityOf = (state: unknown): Activity | undefined => {
  if (typeof state !== 'object' || state === null) return
  const { activity } = state as Partial<PresenceState>
  return activity === 'online' || activity === 'away' ? activity : undefined
}

/**
 * Each person's activity from the presence channel's entries, one per open page: online when any page of theirs is,
 * away when all are. Someone with no page open has no entry, so no activity.
 */
export const peopleActivity = (entries: readonly { user: unknown; state: unknown }[]) => {
  const people = new Map<string, Activity>()
  for (const entry of entries) {
    const activity = activityOf(entry.state)
    if (typeof entry.user !== 'string' || activity === undefined) continue
    if (people.get(entry.user) === 'online') continue
    people.set(entry.user, activity)
  }
  return people
}

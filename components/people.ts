/** A member of the workspace as `useMembers()` gives them: `id` is the user id that authors and mentions hold. */
export type Person = { id: string; name: string; image?: string }

/** How many people `@` lists at most, as comments' mentions do. */
export const mentionLimit = 8

/** The people whose name holds `query`, ignoring case, at most `mentionLimit` of them. */
export const peopleMatching = (people: readonly Person[], query: string) => {
  const wanted = query.toLowerCase()
  return people.filter((person) => person.name.toLowerCase().includes(wanted)).slice(0, mentionLimit)
}

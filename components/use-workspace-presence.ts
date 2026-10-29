import { useState } from 'react'
import type { Presence } from '@protobase/ui'
import { peopleActivity } from './presence'
import { useWorkspaceChannel } from './use-workspace-channel'

const byUser = (entries: Parameters<typeof peopleActivity>[0]): Record<string, Presence> => Object.fromEntries(peopleActivity(entries))

/**
 * Who of the workspace has a page of the chat open, by user id: online when any page of theirs shows and is in use,
 * away otherwise; someone with no page open is not in it. Undefined until the workspace's channel answers. It is the
 * app's `presence` in `protobase.ui.tsx`, which Protobase calls once and its `usePresence()` reads.
 */
export const useWorkspacePresence = () => {
  const [people, setPeople] = useState<Record<string, Presence>>()
  useWorkspaceChannel((channel) => {
    setPeople(byUser(channel.presence()))
    return channel.onPresence((entries) => setPeople(byUser(entries)))
  })
  return people
}

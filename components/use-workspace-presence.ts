import { useState } from 'react'
import { peopleActivity, type Activity } from './presence'
import { useWorkspaceChannel } from './use-workspace-channel'

/**
 * Who of the workspace has a page of the chat open, by user id: online when any page of theirs shows and is in use,
 * away otherwise; someone with no page open is not in it. Undefined until the workspace's channel answers.
 */
export const useWorkspacePresence = () => {
  const [people, setPeople] = useState<ReadonlyMap<string, Activity>>()
  useWorkspaceChannel((channel) => {
    setPeople(peopleActivity(channel.presence()))
    return channel.onPresence((entries) => setPeople(peopleActivity(entries)))
  })
  return people
}

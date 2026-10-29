import { useEffect } from 'react'
import type { Channel } from '@protobase/client'
import { useClient, useSignedInUser } from '@protobase/ui'
import { workspaceKey } from './workspace-channel'

/**
 * Holds the signed-in person's workspace channel while the component shows and hands it to `use`, whose answer stops
 * what it started. Every holder on a page shares one join, on the client's one channel socket.
 */
export const useWorkspaceChannel = (use: (channel: Channel) => () => void) => {
  const client = useClient()
  const signedIn = useSignedInUser() !== undefined
  useEffect(() => {
    if (!signedIn) return
    let left = false
    let stop: (() => void) | undefined
    let channel: Channel | undefined
    workspaceKey(client).then((key) => {
      if (left) return
      channel = client.channel('workspaces', key)
      stop = use(channel)
    }, reportError)
    return () => {
      left = true
      stop?.()
      channel?.leave()
    }
    // `use` is the caller's own and starts over only with the client or the person.
  }, [client, signedIn])
}

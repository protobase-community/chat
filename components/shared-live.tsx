import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useClient } from '@protobase/ui'
import { liveHub } from './live-hub'

const SharedLiveContext = createContext<ReturnType<typeof liveHub> | undefined>(undefined)

/** One live stream for the chat parts inside it: a conversation's messages, its thread's and their reactions. */
export const SharedLive = ({ children }: { children: ReactNode }) => {
  const client = useClient()
  const hub = useMemo(() => liveHub((listener) => client.live(listener)), [client])
  return <SharedLiveContext.Provider value={hub}>{children}</SharedLiveContext.Provider>
}

/** Listens to the live stream of the `SharedLive` around it, until the function it returns is called. */
export const useSharedLive = () => {
  const hub = useContext(SharedLiveContext)
  if (!hub) throw new Error('useSharedLive needs a SharedLive around it')
  return hub.subscribe
}

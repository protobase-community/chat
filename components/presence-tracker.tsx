import { ChannelRefusal } from '@protobase/client'
import { browserPage, followActivity } from './follow-activity'
import type { PresenceState } from './presence'
import { throttled } from './throttled'
import { useWorkspaceChannel } from './use-workspace-channel'

/**
 * The channel takes 5 presence updates a page in 30 seconds, so a page that hides and shows often tracks its latest
 * activity at most once in this time.
 */
const trackGapMs = 7_000

/** A refused track, such as over the channel's limit, is dropped: the next change tracks the page's activity again. */
const dropRefusal = (error: unknown) => {
  if (error instanceof ChannelRefusal) return
  throw error
}

/**
 * Tracks this page on its workspace's presence channel, online or away as it is used, for as long as it is open: the
 * shell draws it on every page (protobase.ui.tsx), and it draws nothing. Closing the page leaves the channel.
 */
export const PresenceTracker = () => {
  useWorkspaceChannel((channel) => {
    const track = throttled((state: PresenceState) => void channel.track(state).catch(dropRefusal), trackGapMs, browserPage)
    const stop = followActivity(browserPage, (activity) => track.take({ activity }))
    return () => {
      stop()
      track.drop()
    }
  })
  return null
}

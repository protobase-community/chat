import { defineUi } from '@protobase/ui'
import { PresenceTracker } from './components/presence-tracker'
import { useDirectMessageMarks } from './components/use-direct-message-marks'
import { useUnreadMarks } from './components/use-unread-marks'
import { useWorkspacePresence } from './components/use-workspace-presence'

// The sidebar marks their `.nav` names, who is online or away, which the sidebar, the Members page and `usePresence()`
// show, and the shell's actions, drawn on every page: the tracker of the page on its workspace's presence, which shows
// nothing.
export default defineUi({
  marks: { unread: useUnreadMarks, directMessages: useDirectMessageMarks },
  presence: useWorkspacePresence,
  shell: { actions: PresenceTracker },
})

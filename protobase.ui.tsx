import { defineUi } from '@protobase/ui'
import { memberNames } from './components/member-names'
import { PresenceTracker } from './components/presence-tracker'
import { useDirectMessageMarks } from './components/use-direct-message-marks'
import { useUnreadMarks } from './components/use-unread-marks'

// The custom components, each in a file of its own, exported by the name their layouts declare.
export { ChannelChat } from './components/channel-chat'
export { DirectMessageChat } from './components/direct-message-chat'

// The titles views derive per reader, by the name their `.titleFrom` gives, the sidebar marks their `.nav` names, and
// the shell's actions, drawn on every page: the tracker of the page on its workspace's presence, which shows nothing.
export default defineUi({
  titles: { memberNames },
  marks: { unread: useUnreadMarks, directMessages: useDirectMessageMarks },
  shell: { actions: PresenceTracker },
})

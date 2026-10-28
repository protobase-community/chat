import { defineUi } from '@protobase/ui'
import { memberNames } from './components/member-names'
import { useUnreadMarks } from './components/use-unread-marks'

// The custom components, each in a file of its own, exported by the name their layouts declare.
export { ChannelChat } from './components/channel-chat'
export { DirectMessageChat } from './components/direct-message-chat'

// The titles views derive per reader, by the name their `.titleFrom` gives, and the sidebar marks their `.nav` names.
export default defineUi({ titles: { memberNames }, marks: { unread: useUnreadMarks } })

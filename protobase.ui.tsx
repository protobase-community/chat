import { defineUi } from '@protobase/ui'
import { memberNames } from './components/member-names'

// The custom components, each in a file of its own, exported by the name their layouts declare.
export { ChannelChat } from './components/channel-chat'
export { DirectMessageChat } from './components/direct-message-chat'

// The titles views derive per reader, by the name their `.titleFrom` gives.
export default defineUi({ titles: { memberNames } })

import { useLayoutRecord, useMembers, useSignedInUser } from '@protobase/ui'
import { ConversationChat } from './conversation-chat'
import { ConversationHeader } from './conversation-header'
import { memberNames } from './member-names'
import { SharedLive } from './shared-live'

/**
 * A direct message's chat, the whole of its record page, under the names of the other people in it, as the sidebar
 * names it: its key while the members load.
 */
export const DirectMessageChat = () => {
  const { record, key } = useLayoutRecord()!
  const user = useSignedInUser()
  const { member } = useMembers()
  const id = Number(record.id)
  const title = memberNames(record, { user, member }) || key
  return (
    <SharedLive>
      <ConversationChat
        key={id}
        conversation={{ field: 'direct_message_id', id }}
        header={<ConversationHeader title={title} />}
        empty="This is the start of your conversation."
        placeholder="Write a message"
      />
    </SharedLive>
  )
}

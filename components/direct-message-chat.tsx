import { useLayoutRecord } from '@protobase/ui'
import { ConversationChat } from './conversation-chat'
import { ConversationHeader } from './conversation-header'
import { DirectMessagePeople } from './direct-message-people'
import { SharedLive } from './shared-live'

/**
 * A direct message's chat, the whole of its record page, under the names of the other people in it, as the sidebar
 * names it, each with their presence and status: its key while the members load.
 */
export const DirectMessageChat = () => {
  const { record, key } = useLayoutRecord()!
  const id = Number(record.id)
  const memberIds = Array.isArray(record.member_ids) ? (record.member_ids as string[]) : []
  return (
    <SharedLive>
      <ConversationChat
        key={id}
        conversation={{ field: 'direct_message_id', id }}
        header={<ConversationHeader title={<DirectMessagePeople memberIds={memberIds} fallback={key} />} />}
        empty="This is the start of your conversation."
        placeholder="Write a message"
      />
    </SharedLive>
  )
}

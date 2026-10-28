import { useLayoutRecord } from '@protobase/ui'
import { ConversationChat } from './conversation-chat'
import { SharedLive } from './shared-live'

/** A direct message's chat, on its record page, whose heading names the other people in it. */
export const DirectMessageChat = () => {
  const { record } = useLayoutRecord()!
  const id = Number(record.id)
  return (
    <SharedLive>
      <ConversationChat
        key={id}
        conversation={{ field: 'direct_message_id', id }}
        empty="This is the start of your conversation."
        placeholder="Write a message"
      />
    </SharedLive>
  )
}

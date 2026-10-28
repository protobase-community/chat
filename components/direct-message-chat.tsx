import { useLayoutRecord } from '@protobase/ui'
import { ConversationChat } from './conversation-chat'

/** A direct message's chat, on its record page, whose heading names the other people in it. */
export const DirectMessageChat = () => {
  const { record } = useLayoutRecord()!
  const id = Number(record.id)
  return (
    <ConversationChat
      key={id}
      conversation={{ field: 'direct_message_id', id }}
      empty="This is the start of your conversation."
      placeholder="Write a message"
    />
  )
}

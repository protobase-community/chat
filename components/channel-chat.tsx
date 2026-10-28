import { useLayoutRecord } from '@protobase/ui'
import { ConversationChat } from './conversation-chat'

/** A channel's chat, on the channel's record page, under its topic. */
export const ChannelChat = () => {
  const { record } = useLayoutRecord()!
  const id = Number(record.id)
  const name = String(record.name)
  return (
    <ConversationChat
      key={id}
      conversation={{ field: 'channel_id', id }}
      topic={record.topic ? String(record.topic) : undefined}
      empty={`This is the start of #${name}.`}
      placeholder={`Message #${name}`}
    />
  )
}

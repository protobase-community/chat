import { useLayoutRecord } from '@protobase/ui'
import { ConversationChat } from './conversation-chat'
import { ConversationHeader } from './conversation-header'

/** A channel's chat, the whole of the channel's record page, under its name and topic. */
export const ChannelChat = () => {
  const { record } = useLayoutRecord()!
  const id = Number(record.id)
  const name = String(record.name)
  return (
    <ConversationChat
      key={id}
      conversation={{ field: 'channel_id', id }}
      header={<ConversationHeader title={name} topic={record.topic ? String(record.topic) : undefined} />}
      empty={`This is the start of #${name}.`}
      placeholder={`Message #${name}`}
    />
  )
}

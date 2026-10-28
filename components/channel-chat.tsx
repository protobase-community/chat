import { ChatThread, useLayoutRecord, useMembers } from '@protobase/ui'
import { ChannelComposer } from './channel-composer'
import { ChannelMessages } from './channel-messages'
import { useChannelMessages } from './use-channel-messages'

/**
 * A channel's chat, on the channel's record page: its messages, followed live, and the composer under them. The thread
 * scrolls inside a box of the window's height, as the chat parts do, so the composer stays in view while a reader goes
 * back through the channel.
 */
export const ChannelChat = () => {
  const { record } = useLayoutRecord()!
  const id = Number(record.id)
  return <Chat key={id} channelId={id} name={String(record.name)} topic={record.topic ? String(record.topic) : undefined} />
}

const Chat = ({ channelId, name, topic }: { channelId: number; name: string; topic?: string }) => {
  const chat = useChannelMessages(channelId)
  const { member } = useMembers()
  return (
    <div className="flex h-[70vh] min-h-80 flex-col">
      {topic && <p className="pb-2 text-sm text-muted-foreground">{topic}</p>}
      <ChatThread
        length={chat.messages.length}
        followKey={chat.sent}
        onLoadEarlier={chat.hasEarlier ? chat.loadEarlier : undefined}
        loadingEarlier={chat.loadingEarlier}
        empty={`This is the start of #${name}.`}
      >
        <ChannelMessages messages={chat.messages} member={member} />
      </ChatThread>
      {chat.error !== undefined && <p className="px-4 text-sm text-danger-text">Could not read or send the messages. Reload the page to try again.</p>}
      <div className="pt-3">
        <ChannelComposer name={name} onSend={chat.send} />
      </div>
    </div>
  )
}

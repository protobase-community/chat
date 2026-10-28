import { Fragment } from 'react'
import { ChatDivider, ChatMessage, MentionedText, chatDayLabel } from '@protobase/ui'
import type { Message } from './message'
import type { Person } from './people'
import { threadRows } from './thread-rows'

/** The thread's rows: a day divider where a day begins, then each message under its author, a quick run of one person's grouped. */
export const ConversationMessages = ({ messages, member }: { messages: Message[]; member: (id: string) => Person | undefined }) =>
  threadRows(messages).map(({ message, newDay, continued }) => (
    <Fragment key={message.id}>
      {newDay && <ChatDivider label={chatDayLabel(message.sent_at)} />}
      <ChatMessage author={{ id: message.author_id, name: member(message.author_id)?.name }} time={message.sent_at} continued={continued}>
        <MentionedText text={message.body} mentions={message.mentions.map((id) => ({ name: member(id)?.name }))} />
      </ChatMessage>
    </Fragment>
  ))

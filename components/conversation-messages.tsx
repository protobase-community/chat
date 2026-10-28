import { Fragment } from 'react'
import { ChatDivider, ChatMessage, MentionedText, chatDayLabel } from '@protobase/ui'
import type { Message } from './message'
import type { Person } from './people'
import { threadRows } from './thread-rows'

type Props = { messages: Message[]; member: (id: string) => Person | undefined; newLineAbove?: number }

/**
 * The thread's rows: a day divider where a day begins, the "New messages" line above the message `newLineAbove` names,
 * then each message under its author, a quick run of one person's grouped.
 */
export const ConversationMessages = ({ messages, member, newLineAbove }: Props) =>
  threadRows(messages).map(({ message, newDay, continued }) => (
    <Fragment key={message.id}>
      {newDay && <ChatDivider label={chatDayLabel(message.sent_at)} />}
      {message.id === newLineAbove && <ChatDivider tone="new" />}
      <ChatMessage author={{ id: message.author_id, name: member(message.author_id)?.name }} time={message.sent_at} continued={continued && message.id !== newLineAbove}>
        <MentionedText text={message.body} mentions={message.mentions.map((id) => ({ name: member(id)?.name }))} />
      </ChatMessage>
    </Fragment>
  ))

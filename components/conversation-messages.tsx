import { Fragment } from 'react'
import { ChatDivider, chatDayLabel } from '@protobase/ui'
import { attachmentsByMessage, type Attachment } from './attachment'
import { ConversationMessage, type MessageHandlers } from './conversation-message'
import type { Message } from './message'
import type { Person } from './people'
import { reactionGroups, reactionsByMessage, type Reaction } from './reaction'
import { threadRows } from './thread-rows'

type Props = MessageHandlers & {
  messages: Message[]
  reactions: readonly Reaction[]
  attachments: readonly Attachment[]
  me: string
  member: (id: string) => Person | undefined
  newLineAbove?: number
  /** When what shows above these was sent, such as a thread's first message above its replies. */
  shownAbove?: string
}

/**
 * The chat's rows: a day divider where a day begins, the "New messages" line above the message `newLineAbove` names,
 * then each message under its author, a quick run of one person's grouped, with its files and reactions.
 */
export const ConversationMessages = ({ messages, reactions, attachments, me, member, newLineAbove, shownAbove, ...handlers }: Props) => {
  const reactionsOf = reactionsByMessage(reactions)
  const attachmentsOf = attachmentsByMessage(attachments)
  return threadRows(messages, shownAbove).map(({ message, newDay, continued }) => (
    <Fragment key={message.id}>
      {newDay && <ChatDivider label={chatDayLabel(message.sent_at)} />}
      {message.id === newLineAbove && <ChatDivider tone="new" />}
      <ConversationMessage
        message={message}
        continued={continued && message.id !== newLineAbove}
        mine={message.author_id === me}
        reactions={reactionGroups(reactionsOf.get(message.id) ?? [], me)}
        attachments={attachmentsOf.get(message.id) ?? []}
        member={member}
        {...handlers}
      />
    </Fragment>
  ))
}

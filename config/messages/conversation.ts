import { emojiLabels } from '../reactions/labels'

/**
 * What a channel's and a direct message's conversation pages share: their messages, under each author's name and time,
 * with "(edited)", mentions, reactions, threads and files, the reader's read position and who types. Authors edit their
 * own; a thread's first message is not deleted while it has replies, which the database refuses too.
 */
export const messagesConversation = {
  resource: 'messages',
  sender: 'author_id',
  time: 'sent_at',
  text: 'body',
  edited: 'edited_at',
  mentions: 'mentions',
  edit: true,
  delete: { unless: 'reply_count > 0' },
  reactions: { resource: 'reactions', field: 'message_id', user: 'user_id', emoji: 'emoji', labels: emojiLabels },
  thread: { field: 'thread_id', count: 'reply_count', last: 'last_reply_at' },
  attachments: { resource: 'attachments', field: 'message_id', file: 'file', width: 'width', height: 'height' },
  typing: true,
} as const

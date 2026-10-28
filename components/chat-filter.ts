import type { Conversation } from './conversation'

/**
 * The filter of the messages one chat shows: with `threadId`, that thread's replies; else the conversation's flow, its
 * messages outside threads. Each reads an index by id: the thread's, or the conversation's messages outside threads.
 */
export const chatFilter = ({ field, id }: Conversation, threadId?: number) =>
  threadId === undefined ? `${field} = ${id} AND isNull(thread_id)` : `thread_id = ${threadId}`

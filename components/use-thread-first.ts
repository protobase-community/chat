import { useEffect, useState } from 'react'
import { useClient } from '@protobase/ui'
import { chatFilter } from './chat-filter'
import type { Conversation } from './conversation'
import { toMessage, type Message } from './message'

/**
 * The first message of the thread `threadId`: as the conversation's flow holds it, followed live, or read once from the
 * messages API when it is older than the flow's pages, as a link to an old reply opens it. Undefined while it loads, and
 * for a message that is not in this conversation's flow or not the reader's to read; `error` when it could not be read.
 */
export const useThreadFirst = (conversation: Conversation, flow: Message[], threadId: number | undefined) => {
  const client = useClient()
  const inFlow = flow.find((message) => message.id === threadId)
  const [read, setRead] = useState<Message>()
  const [error, setError] = useState<unknown>()
  const filter = threadId === undefined || inFlow ? undefined : `${chatFilter(conversation)} AND id = ${threadId}`
  useEffect(() => {
    setRead(undefined)
    if (filter === undefined) return
    let current = true
    client.list('messages', { filter, pageSize: 1 }).then(
      (page) => {
        const first = page.items[0]
        if (current && first) setRead(toMessage(first))
      },
      (failed: unknown) => {
        if (current) setError(failed)
      },
    )
    return () => {
      current = false
    }
  }, [client, filter])
  return { first: inFlow ?? (read?.id === threadId ? read : undefined), error }
}

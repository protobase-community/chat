import { useCallback, useEffect, useState } from 'react'
import { ChannelRefusal, type Channel } from '@protobase/client'
import { useClient } from '@protobase/ui'
import type { Conversation } from './conversation'
import { heard, nextExpiry, type Typers, type TypingPayload } from './typing'

const resources = { channel_id: 'channels', direct_message_id: 'direct_messages' } as const

/** A refused send, such as over the channel's limit or while the connection is down, is dropped: typing is short-lived. */
const dropRefusal = (error: unknown) => {
  if (error instanceof ChannelRefusal) return
  throw error
}

/**
 * Who types in a conversation, and the broadcast of the reader's own typing, on the conversation's own channel: the
 * channel of its record, so only those who read the conversation hear it, a private channel's or direct message's
 * members alone. `typers` keeps each typer until their typing runs out; the page draws them again then.
 */
export const useConversationTyping = (conversation: Conversation) => {
  const client = useClient()
  const [channel, setChannel] = useState<Channel>()
  const [typers, setTypers] = useState<Typers>(new Map())

  useEffect(() => {
    // Joins after this task: development mounts every effect twice at once, and the client cannot yet let go of a
    // channel whose join the server has not answered, so a join of the first, discarded mount would leave the second
    // refused as already joined.
    let left = false
    let joined: Channel | undefined
    let stop: (() => void) | undefined
    queueMicrotask(() => {
      if (left) return
      joined = client.channel(resources[conversation.field], conversation.id)
      setChannel(joined)
      stop = joined.on('typing', ({ user, payload }) => setTypers((now) => heard(now, user, payload, Date.now())))
    })
    return () => {
      left = true
      stop?.()
      joined?.leave()
      setChannel(undefined)
      setTypers(new Map())
    }
  }, [client, conversation.field, conversation.id])

  // Draws the typers again when the first of them runs out, dropping those who ran out.
  useEffect(() => {
    const expiry = nextExpiry(typers)
    if (expiry === undefined) return
    const timer = setTimeout(() => setTypers((now) => new Map([...now].filter(([, typing]) => typing.until > Date.now()))), expiry - Date.now())
    return () => clearTimeout(timer)
  }, [typers])

  /** Broadcasts whether the reader types in `thread`, null for the conversation outside threads: false before it joined. */
  const send = useCallback(
    (payload: TypingPayload) => {
      if (channel?.status().state !== 'joined') return false
      channel.send('typing', payload).catch(dropRefusal)
      return true
    },
    [channel],
  )
  return { typers, send }
}

// Speaks `GET /api/channels`, the record channels' WebSocket the app's pages share, as one person: their bearer token
// offered as a subprotocol, as the client does. Every frame the server sends is kept, in order.

export type Frame = { type: string; [field: string]: unknown }

export const openChannels = async (appUrl: string, headers: Record<string, string>) => {
  const token = headers.authorization!.replace(/^Bearer /, '')
  const socket = new WebSocket(`${appUrl.replace(/^http/, 'ws')}/api/channels`, ['protobase.channels', `bearer.${token}`])
  const frames: Frame[] = []
  socket.addEventListener('message', (event) => frames.push(JSON.parse(String(event.data))))
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', () => reject(new Error('The channels socket did not open')), { once: true })
  })
  let ref = 0

  /** The first frame from `from` on that `matches`, within `ms`; undefined when none came. */
  const frame = async (matches: (frame: Frame) => boolean, ms = 5_000, from = 0) => {
    const deadline = Date.now() + ms
    while (Date.now() < deadline) {
      const found = frames.slice(from).find(matches)
      if (found) return found
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return
  }
  const request = async (message: Record<string, unknown>) => {
    ref += 1
    const sent = String(ref)
    socket.send(JSON.stringify({ ...message, ref: sent }))
    return frame((each) => each.type === 'reply' && each.ref === sent)
  }

  return {
    frames,
    frame,
    /** Joins a record's channel: the server's reply, `ok` with the channel's name, or the refusal. */
    join: (resource: string, key: string | number) => request({ type: 'join', resource, key: String(key) }),
    track: (channel: string, state: unknown) => request({ type: 'track', channel, state }),
    send: (channel: string, event: string, payload: unknown) => request({ type: 'send', channel, event, payload, ack: true }),
    close: () => socket.close(),
  }
}

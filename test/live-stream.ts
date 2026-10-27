// Follows `GET /api/live` as one person, the stream the app's pages hear changes on: its `changes` events, each a
// list of `{ resource, key, operation }`.

export type LiveChange = { resource: string; key: string | number; operation: string }

export const followLive = async (url: string, headers: Record<string, string>) => {
  const abort = new AbortController()
  const answer = await fetch(`${url}/api/live`, { headers, signal: abort.signal })
  if (!answer.ok || !answer.body) throw new Error(`GET /api/live answered ${answer.status}`)
  const reader = answer.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  // One read at a time: a read that a timeout outran is the next one's, so nothing it brings is lost.
  let pending: ReturnType<typeof reader.read> | undefined

  const nextEvents = async () => {
    pending ??= reader.read()
    const { value, done } = await pending
    pending = undefined
    if (done) throw new Error('The live stream ended')
    buffer += value
    const events = buffer.split('\n\n')
    buffer = events.pop()!
    return events.flatMap((event) => event.split('\n').filter((line) => line.startsWith('data:')).map((line) => JSON.parse(line.slice(5))))
  }

  // The first event says the stream is current, so what follows is new.
  while ((await nextEvents()).length === 0);

  /** Whether a change that `matches` arrives within `ms`. */
  const changes = async (matches: (change: LiveChange) => boolean, ms: number) => {
    const deadline = Date.now() + ms
    while (Date.now() < deadline) {
      const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), deadline - Date.now()))
      const events = await Promise.race([nextEvents(), timeout])
      if (events === 'timeout') return false
      if (events.some((event) => event.type === 'changes' && (event.changes as LiveChange[]).some(matches))) return true
    }
    return false
  }

  return { changes, stop: () => abort.abort() }
}

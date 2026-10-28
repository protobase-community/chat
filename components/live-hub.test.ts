import { describe, expect, it, vi } from 'vitest'
import { liveHub, type LiveListener } from './live-hub'

const listener = (): LiveListener => ({ onChanges: vi.fn(), onResync: vi.fn() })

describe('liveHub', () => {
  it('opens one stream for every listener and tells each of its changes and resyncs', () => {
    let stream: LiveListener | undefined
    const connect = vi.fn((each: LiveListener) => ((stream = each), () => {}))
    const hub = liveHub(connect)
    const [first, second] = [listener(), listener()]
    hub.subscribe(first)
    hub.subscribe(second)
    expect(connect).toHaveBeenCalledTimes(1)
    const changes = [{ resource: 'messages', key: '1', operation: 'create' as const }]
    stream!.onChanges(changes)
    stream!.onResync()
    for (const each of [first, second]) {
      expect(each.onChanges).toHaveBeenCalledWith(changes)
      expect(each.onResync).toHaveBeenCalledTimes(1)
    }
  })

  it('closes the stream when the last listener leaves, and opens it again for the next', () => {
    const stop = vi.fn()
    const connect = vi.fn(() => stop)
    const hub = liveHub(connect)
    const leaveFirst = hub.subscribe(listener())
    const leaveSecond = hub.subscribe(listener())
    leaveFirst()
    expect(stop).not.toHaveBeenCalled()
    leaveSecond()
    expect(stop).toHaveBeenCalledTimes(1)
    hub.subscribe(listener())
    expect(connect).toHaveBeenCalledTimes(2)
  })
})

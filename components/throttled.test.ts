import { describe, expect, it } from 'vitest'
import { throttled } from './throttled'

const fakeClock = () => {
  let now = 0
  let timers: { at: number; run: () => void }[] = []
  return {
    now: () => now,
    setTimer: (run: () => void, ms: number) => {
      const timer = { at: now + ms, run }
      timers.push(timer)
      return () => (timers = timers.filter((each) => each !== timer))
    },
    advance: (ms: number) => {
      now += ms
      const due = timers.filter((timer) => timer.at <= now)
      timers = timers.filter((timer) => timer.at > now)
      for (const timer of due) timer.run()
    },
  }
}

describe('throttled', () => {
  it('runs the first value at once and the latest of those within the gap once it has passed', () => {
    const clock = fakeClock()
    const ran: string[] = []
    const { take } = throttled((value: string) => ran.push(value), 1000, clock)
    take('a')
    take('b')
    take('c')
    expect(ran).toEqual(['a'])
    clock.advance(1000)
    expect(ran).toEqual(['a', 'c'])
  })

  it('runs at once again after a quiet gap', () => {
    const clock = fakeClock()
    const ran: string[] = []
    const { take } = throttled((value: string) => ran.push(value), 1000, clock)
    take('a')
    clock.advance(5000)
    take('b')
    expect(ran).toEqual(['a', 'b'])
  })

  it('drops a waiting value', () => {
    const clock = fakeClock()
    const ran: string[] = []
    const { take, drop } = throttled((value: string) => ran.push(value), 1000, clock)
    take('a')
    take('b')
    drop()
    clock.advance(1000)
    expect(ran).toEqual(['a'])
  })
})

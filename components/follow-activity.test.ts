import { describe, expect, it } from 'vitest'
import { followActivity, type Page } from './follow-activity'
import { idleAfterMs, type Activity } from './presence'

/** A page whose clock, visibility, input and timers the test drives. */
const fakePage = () => {
  let now = 0
  let visible = true
  let timers: { at: number; run: () => void }[] = []
  let onUse = () => {}
  let onVisibility = () => {}
  const page: Page = {
    visible: () => visible,
    now: () => now,
    listen: (use, visibility) => {
      onUse = use
      onVisibility = visibility
      return () => {}
    },
    setTimer: (run, ms) => {
      const timer = { at: now + ms, run }
      timers.push(timer)
      return () => (timers = timers.filter((each) => each !== timer))
    },
  }
  const advance = (ms: number) => {
    now += ms
    const due = timers.filter((timer) => timer.at <= now)
    timers = timers.filter((timer) => timer.at > now)
    for (const timer of due) timer.run()
  }
  return { page, advance, use: () => onUse(), show: (shown: boolean) => ((visible = shown), onVisibility()) }
}

const follow = () => {
  const fake = fakePage()
  const told: Activity[] = []
  followActivity(fake.page, (activity) => told.push(activity))
  return { ...fake, told }
}

describe('followActivity', () => {
  it('tells online at once for a page that shows', () => {
    expect(follow().told).toEqual(['online'])
  })

  it('turns away when the page hides and online when it shows again', () => {
    const page = follow()
    page.show(false)
    page.show(true)
    expect(page.told).toEqual(['online', 'away', 'online'])
  })

  it('turns away after the idle time without use, and online at the next use', () => {
    const page = follow()
    page.advance(idleAfterMs - 1)
    expect(page.told).toEqual(['online'])
    page.advance(1)
    expect(page.told).toEqual(['online', 'away'])
    page.use()
    expect(page.told).toEqual(['online', 'away', 'online'])
  })

  it('stays online while the page is used now and then', () => {
    const page = follow()
    for (let minute = 0; minute < 30; minute += 1) {
      page.advance(60_000)
      page.use()
    }
    expect(page.told).toEqual(['online'])
  })
})

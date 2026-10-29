import { describe, expect, it } from 'vitest'
import { heard, nextExpiry, typingIn, typingLine, typingSendGapMs, typingSender, typingShownMs } from './typing'

describe('typingLine', () => {
  it('names one, two, or none of several', () => {
    expect(typingLine([])).toBeUndefined()
    expect(typingLine(['Maya'])).toBe('Maya is typing…')
    expect(typingLine(['Maya', 'Sam'])).toBe('Maya and Sam are typing…')
    expect(typingLine(['Maya', 'Sam', 'Lena'])).toBe('Several people are typing…')
  })
})

describe('heard and typingIn', () => {
  it('shows a typer in their conversation or thread until the shown time has passed', () => {
    let typers = heard(new Map(), 'sam', { typing: true, thread: null }, 0)
    typers = heard(typers, 'lena', { typing: true, thread: 7 }, 0)
    expect(typingIn(typers, null, typingShownMs - 1, 'maya')).toEqual(['sam'])
    expect(typingIn(typers, 7, 0, 'maya')).toEqual(['lena'])
    expect(typingIn(typers, null, typingShownMs, 'maya')).toEqual([])
    expect(nextExpiry(typers)).toBe(typingShownMs)
  })

  it('stops showing a typer who said they stopped', () => {
    const typing = heard(new Map(), 'sam', { typing: true, thread: null }, 0)
    expect(typingIn(heard(typing, 'sam', { typing: false, thread: null }, 1), null, 1, 'maya')).toEqual([])
  })

  it('never shows the reader themselves, and ignores what is no typing payload', () => {
    const typers = heard(new Map(), 'maya', { typing: true, thread: null }, 0)
    expect(typingIn(typers, null, 0, 'maya')).toEqual([])
    expect(heard(typers, 'sam', { typing: 'yes' }, 0)).toBe(typers)
    expect(heard(typers, null, { typing: true, thread: null }, 0)).toBe(typers)
  })
})

describe('typingSender', () => {
  const sender = ({ joined = true } = {}) => {
    let now = 0
    let timers: { at: number; run: () => void }[] = []
    const clock = {
      now: () => now,
      setTimer: (run: () => void, ms: number) => {
        const timer = { at: now + ms, run }
        timers.push(timer)
        return () => (timers = timers.filter((each) => each !== timer))
      },
    }
    const sent: boolean[] = []
    const state = { joined }
    const typer = typingSender((typing) => state.joined && sent.push(typing) > 0, clock)
    const advance = (ms: number) => {
      now += ms
      const due = timers.filter((timer) => timer.at <= now)
      timers = timers.filter((timer) => timer.at > now)
      for (const timer of due) timer.run()
    }
    return { ...typer, sent, advance, state }
  }

  it('sends that its person types at once, then at most once every gap', () => {
    const typer = sender()
    typer.onText('H')
    typer.advance(typingSendGapMs - 1)
    typer.onText('Hello')
    expect(typer.sent).toEqual([true])
    typer.advance(1)
    expect(typer.sent).toEqual([true, true])
  })

  it('tells text written within a gap once the gap has passed', () => {
    const typer = sender()
    typer.onText('Hi')
    typer.onSent()
    typer.onText('And')
    expect(typer.sent).toEqual([true, false])
    typer.advance(typingSendGapMs)
    expect(typer.sent).toEqual([true, false, true])
  })

  it('sends that they stopped once when the box is emptied or the message sent, dropping a send still waiting', () => {
    const typer = sender()
    typer.onText('Hi')
    typer.onText('Hi there')
    typer.onText('')
    typer.onText('  ')
    typer.advance(typingSendGapMs)
    expect(typer.sent).toEqual([true, false])
    typer.onText('Hi again')
    typer.onSent()
    typer.onSent()
    expect(typer.sent).toEqual([true, false, true, false])
  })

  it('tries again at the next text when a send could not go, such as before the channel joined', () => {
    const typer = sender({ joined: false })
    typer.onText('H')
    expect(typer.sent).toEqual([])
    typer.state.joined = true
    typer.onText('He')
    expect(typer.sent).toEqual([true])
  })

  it('sends nothing more once disposed', () => {
    const typer = sender()
    typer.onText('Hi')
    typer.onText('Hi there')
    typer.dispose()
    typer.advance(typingSendGapMs)
    expect(typer.sent).toEqual([true])
  })
})

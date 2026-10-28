import { describe, expect, it, vi } from 'vitest'
import { followUnread, type Marks } from './follow-unread'

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
const marked: Marks = { '1': { strong: true, count: 2, label: '2 unread mentions' } }

/** Follows the marks with `count`, keeping each answer and error, and the change it listens for. */
const follow = (count: () => Promise<Marks>) => {
  const answers: (Marks | undefined)[] = []
  const errors: unknown[] = []
  let change = () => {}
  const stop = followUnread({
    count,
    listen: (recount) => {
      change = recount
      return () => {}
    },
    onMarks: (marks) => answers.push(marks),
    onError: (error) => errors.push(error),
  })
  return { answers, errors, change: () => change(), stop }
}

describe('followUnread', () => {
  it('answers nothing while the first count runs, then its marks', async () => {
    let finish = (_marks: Marks) => {}
    const following = follow(() => new Promise((resolve) => (finish = resolve)))
    expect(following.answers).toEqual([])
    finish(marked)
    await settle()
    expect(following.answers).toEqual([marked])
  })

  it('answers no marks when a count fails, so the sidebar lists the conversations unmarked, and hands on the error', async () => {
    const failure = new Error('The count request failed')
    const count = vi.fn<() => Promise<Marks>>().mockResolvedValueOnce(marked).mockRejectedValueOnce(failure).mockResolvedValueOnce({})
    const following = follow(count)
    await settle()
    following.change()
    await settle()
    expect(following.answers).toEqual([marked, undefined])
    expect(following.errors).toEqual([failure])
    following.change()
    await settle()
    expect(following.answers).toEqual([marked, undefined, {}])
  })

  it('counts once more after a change that came while counting', async () => {
    const count = vi.fn(async () => marked)
    const following = follow(count)
    following.change()
    following.change()
    await settle()
    expect(count).toHaveBeenCalledTimes(2)
  })

  it('answers nothing once stopped', async () => {
    let finish = (_marks: Marks) => {}
    const following = follow(() => new Promise((resolve) => (finish = resolve)))
    following.stop()
    finish(marked)
    await settle()
    expect(following.answers).toEqual([])
  })
})

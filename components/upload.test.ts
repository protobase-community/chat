import { describe, expect, it } from 'vitest'
import { maxFileBytes, maxFilesPerMessage } from '../config/attachments/limits'
import { hasFilesToSend, isUploading, ticketsOf, uploadsOf, type Upload } from './upload'

const file = (name: string, size = 1_000) => ({ name, size })

describe('uploadsOf', () => {
  it('starts each picked file, numbered on from the key given', () => {
    expect(uploadsOf([], [file('a.png'), file('b.pdf')], 7)).toEqual([
      { key: 7, name: 'a.png', size: 1_000, sent: 0, refusal: undefined },
      { key: 8, name: 'b.pdf', size: 1_000, sent: 0, refusal: undefined },
    ])
  })

  it('refuses a file above the size limit with why, and starts the others', () => {
    const [large, small] = uploadsOf([], [file('video.mov', maxFileBytes + 1), file('note.txt')], 0, 'en')
    expect(large!.refusal).toBe('video.mov is 20 MB: a file may be at most 20 MB.')
    expect(small!.refusal).toBeUndefined()
  })

  it('leaves out the files past the most one message carries, counting those already picked', () => {
    const picked = uploadsOf([], Array.from({ length: maxFilesPerMessage - 1 }, (_, index) => file(`${index}.png`)), 0)
    const [last, extra] = uploadsOf(picked, [file('last.png'), file('extra.png')], 100)
    expect(last!.refusal).toBeUndefined()
    expect(extra!.refusal).toBe(`extra.png was left out: a message carries at most ${maxFilesPerMessage} files.`)
  })
})

describe('ticketsOf and isUploading', () => {
  it('send the finished uploads and wait for those on their way', () => {
    const uploads: Upload[] = [
      { key: 1, name: 'a.png', size: 1, sent: 1, ticket: 't1' },
      { key: 2, name: 'b.png', size: 1, sent: 0 },
      { key: 3, name: 'c.png', size: 1, sent: 0, refusal: 'Too large' },
    ]
    expect(ticketsOf(uploads)).toEqual(['t1'])
    expect(uploads.map(isUploading)).toEqual([false, true, false])
  })
})

describe('hasFilesToSend', () => {
  const done: Upload = { key: 1, name: 'shot.png', size: 1, sent: 1, ticket: 't1' }
  const onTheWay: Upload = { key: 2, name: 'doc.pdf', size: 1, sent: 0 }
  const refused: Upload = { key: 3, name: 'video.mov', size: 1, sent: 0, refusal: 'Too large' }

  it('lets the message go without text once its files are uploaded', () => {
    expect(hasFilesToSend([done, refused])).toBe(true)
  })

  it('keeps a message without text from going with no files, only refused ones, or one still on its way', () => {
    expect(hasFilesToSend([])).toBe(false)
    expect(hasFilesToSend([refused])).toBe(false)
    expect(hasFilesToSend([done, onTheWay])).toBe(false)
  })
})

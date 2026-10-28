import { describe, expect, it } from 'vitest'
import { maxFileBytes } from '../config/attachments/limits'
import { formatSize, isPreviewed, refusalOf, toAttachment } from './attachment'

describe('toAttachment', () => {
  it('reads the file the API answers, and an image’s size', () => {
    const record = { id: 3, message_id: 9, width: 640, height: 480, file: { uri: 'private:1/a.png?name=shot.png&size=48211', name: 'shot.png', type: 'image/png', size: 48211, url: '/api/files/private/1/a.png?sig=x' } }
    expect(toAttachment(record)).toEqual({ id: 3, message_id: 9, name: 'shot.png', type: 'image/png', size: 48211, url: '/api/files/private/1/a.png?sig=x', width: 640, height: 480 })
  })

  it('has no link for a file missing from storage, and no pixel size for a document', () => {
    const attachment = toAttachment({ id: 4, message_id: 9, width: null, height: null, file: { uri: 'gone:1/b.pdf', missing: true } })
    expect(attachment).toMatchObject({ url: undefined, size: null, width: null, height: null })
  })
})

describe('isPreviewed', () => {
  it('shows an image a browser draws', () => {
    expect(isPreviewed({ type: 'image/jpeg', url: '/f' })).toBe(true)
  })

  it('offers a PDF, or an image whose file is missing, as a file instead', () => {
    expect(isPreviewed({ type: 'application/pdf', url: '/f' })).toBe(false)
    expect(isPreviewed({ type: 'image/png', url: undefined })).toBe(false)
  })
})

describe('formatSize', () => {
  it('uses the largest decimal unit the size reaches', () => {
    expect(formatSize(512, 'en')).toBe('512 bytes')
    expect(formatSize(1, 'en')).toBe('1 byte')
    expect(formatSize(48_211, 'en')).toBe('48.2 kB')
    expect(formatSize(1_500_000, 'en')).toBe('1.5 MB')
  })
})

describe('refusalOf', () => {
  it('takes a file up to the limit', () => {
    expect(refusalOf({ name: 'brief.pdf', size: maxFileBytes }, 'en')).toBeUndefined()
  })

  it('refuses a larger one, naming it, its size and the limit', () => {
    expect(refusalOf({ name: 'video.mov', size: 25_000_000 }, 'en')).toBe('video.mov is 25 MB: a file may be at most 20 MB.')
  })
})

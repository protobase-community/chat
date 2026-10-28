import { maxFilesPerMessage } from '../config/attachments/limits'
import { refusalOf } from './attachment'

/**
 * A file picked for the next message: uploading while it has neither `ticket` nor `refusal`, ready to send with its
 * `ticket`, or refused with why.
 */
export type Upload = { key: number; name: string; size: number; sent: number; ticket?: string; refusal?: string }

/** The uploads `files` add to `current`: each refused when it is too large or the message is full, numbered from `firstKey`. */
export const uploadsOf = (current: readonly Upload[], files: readonly { name: string; size: number }[], firstKey: number, locale?: string): Upload[] => {
  let room = maxFilesPerMessage - current.filter((upload) => upload.refusal === undefined).length
  return files.map((file, index) => {
    const refusal = refusalOf(file, locale) ?? (room > 0 ? undefined : `${file.name} was left out: a message carries at most ${maxFilesPerMessage} files.`)
    if (refusal === undefined) room -= 1
    return { key: firstKey + index, name: file.name, size: file.size, sent: 0, refusal }
  })
}

/** Whether a file is still on its way. */
export const isUploading = (upload: Upload) => upload.ticket === undefined && upload.refusal === undefined

/** The tickets of the uploads that are done, to send as the message's files. */
export const ticketsOf = (uploads: readonly Upload[]) => uploads.flatMap((upload) => (upload.ticket === undefined ? [] : [upload.ticket]))

/** Whether the message may go without text: a file is uploaded and none is still on its way. */
export const hasFilesToSend = (uploads: readonly Upload[]) => !uploads.some(isUploading) && ticketsOf(uploads).length > 0

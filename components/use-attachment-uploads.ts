import { useCallback, useEffect, useRef, useState } from 'react'
import { useClient } from '@protobase/ui'
import { isUploading, ticketsOf, uploadsOf, type Upload } from './upload'

/**
 * The files picked for the next message, each uploaded to the attachments' storage as soon as it is picked, so sending
 * waits for none. `pick` adds files, `remove` takes one off and stops its upload, `clear` empties the list once the
 * message is sent. `tickets` are the finished uploads' values, which the message's write takes.
 */
export const useAttachmentUploads = () => {
  const client = useClient()
  const [uploads, setUploads] = useState<Upload[]>([])
  const nextKey = useRef(0)
  const stops = useRef(new Map<number, AbortController>())

  const change = useCallback((key: number, patch: Partial<Upload>) => setUploads((current) => current.map((upload) => (upload.key === key ? { ...upload, ...patch } : upload))), [])

  const start = useCallback(
    (upload: Upload, file: File) => {
      const stop = new AbortController()
      stops.current.set(upload.key, stop)
      client
        .upload('attachments', 'file', file, { signal: stop.signal, onProgress: (sent) => change(upload.key, { sent }) })
        .then(
          (result) => change(upload.key, { ticket: result.value }),
          () => {
            // Taken off by the reader, who no longer waits on it.
            if (stop.signal.aborted) return
            change(upload.key, { refusal: `${file.name} could not be uploaded. Take it off and pick it again.` })
          },
        )
        .finally(() => stops.current.delete(upload.key))
    },
    [client, change],
  )

  const pick = useCallback(
    (files: readonly File[]) => {
      const added = uploadsOf(uploads, files, nextKey.current)
      nextKey.current += files.length
      setUploads((current) => [...current, ...added])
      added.forEach((upload, index) => {
        if (upload.refusal === undefined) start(upload, files[index]!)
      })
    },
    [uploads, start],
  )

  const remove = useCallback((key: number) => {
    stops.current.get(key)?.abort()
    setUploads((current) => current.filter((upload) => upload.key !== key))
  }, [])

  const clear = useCallback(() => setUploads([]), [])

  // Uploads still on their way when the conversation closes are stopped.
  useEffect(() => () => stops.current.forEach((stop) => stop.abort()), [])

  return { uploads, tickets: ticketsOf(uploads), uploading: uploads.some(isUploading), pick, remove, clear }
}

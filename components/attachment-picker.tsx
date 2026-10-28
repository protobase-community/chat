import { useRef } from 'react'
import { Button } from '@protobase/ui'

/** A button in the composer that opens the browser's file picker, giving the files the reader picks. */
export const AttachmentPicker = ({ onPick }: { onPick: (files: File[]) => void }) => {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          onPick([...(event.target.files ?? [])])
          // Picking the same file again after taking it off is a change too.
          event.target.value = ''
        }}
      />
      <Button type="button" variant="secondary" aria-label="Attach files" title="Attach files" onClick={() => input.current?.click()}>
        <span aria-hidden>📎</span>
      </Button>
    </>
  )
}

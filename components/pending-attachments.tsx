import { Button } from '@protobase/ui'
import { formatSize } from './attachment'
import type { Upload } from './upload'

type Props = {
  uploads: readonly Upload[]
  onRemove: (key: number) => void
}

/** The files picked, pasted or dropped for the next message, in the composer above its box: each with its size, how far its upload is, or why it was refused. */
export const PendingAttachments = ({ uploads, onRemove }: Props) => (
  <div className="flex flex-wrap items-center gap-2">
    {uploads.map((upload) => (
      <span key={upload.key} className="flex items-center gap-1 rounded-md border border-border py-0.5 pl-2 text-sm">
        <span className="max-w-48 truncate">{upload.name}</span>
        <span className={upload.refusal ? 'text-danger-text' : 'text-muted-foreground'}>{upload.refusal ?? progressOf(upload)}</span>
        <Button type="button" size="icon" variant="ghost" aria-label={`Take ${upload.name} off`} title="Take it off" onClick={() => onRemove(upload.key)}>
          <span aria-hidden>×</span>
        </Button>
      </span>
    ))}
  </div>
)

const progressOf = (upload: Upload) => {
  if (upload.ticket !== undefined || upload.size === 0) return formatSize(upload.size)
  return `${Math.floor((upload.sent / upload.size) * 100)}%`
}

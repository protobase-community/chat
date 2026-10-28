import { buttonClass } from '@protobase/ui'
import { formatSize, isPreviewed, type Attachment } from './attachment'

/** The tallest an image preview is drawn, in pixels; wider images are scaled down to the message's width. */
const previewHeight = 240

/**
 * A message's files under its text: each image as a preview that opens it, any other file as a link with its name and
 * size that downloads it. The links are signed for the reader, as the attachments API gives them.
 */
export const MessageAttachments = ({ attachments }: { attachments: readonly Attachment[] }) => (
  <div className="mt-1 flex flex-wrap items-start gap-2">
    {attachments.map((attachment) =>
      isPreviewed(attachment) ? (
        <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" title={attachment.name}>
          <img
            src={attachment.url}
            alt={attachment.name}
            width={attachment.width ?? undefined}
            height={attachment.height ?? undefined}
            style={{ maxHeight: previewHeight }}
            className="h-auto w-auto max-w-full rounded-md border border-border object-contain"
          />
        </a>
      ) : (
        <FileLink key={attachment.id} attachment={attachment} />
      ),
    )}
  </div>
)

const FileLink = ({ attachment }: { attachment: Attachment }) => {
  const label = (
    <>
      <span aria-hidden>📄</span>
      <span className="max-w-64 truncate">{attachment.name}</span>
      {attachment.size !== null && <span className="text-muted-foreground">{formatSize(attachment.size)}</span>}
    </>
  )
  if (attachment.url === undefined) return <span className={buttonClass({ variant: 'secondary', size: 'sm' })}>{label} (missing)</span>
  return (
    <a href={attachment.url} download={attachment.name} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
      {label}
    </a>
  )
}

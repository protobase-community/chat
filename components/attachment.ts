import { maxFileBytes } from '../config/attachments/limits'

/** A file shared in a message as the chat page holds it, read from the attachments API. */
export type Attachment = {
  id: number
  message_id: number
  name: string
  type: string
  /** In bytes; null when the stored value does not say. */
  size: number | null
  /** The signed link that downloads it; undefined when its file is missing from storage. */
  url: string | undefined
  /** An image's size in pixels; null for any other file. */
  width: number | null
  height: number | null
}

/** A record of the attachments API as an `Attachment`. Its `file` is the object the API answers for a file field. */
export const toAttachment = (record: Record<string, unknown>): Attachment => {
  const file = (record.file ?? {}) as { name?: unknown; type?: unknown; size?: unknown; url?: unknown }
  return {
    id: Number(record.id),
    message_id: Number(record.message_id),
    name: typeof file.name === 'string' ? file.name : '',
    type: typeof file.type === 'string' ? file.type : '',
    size: typeof file.size === 'number' ? file.size : null,
    url: typeof file.url === 'string' ? file.url : undefined,
    width: record.width == null ? null : Number(record.width),
    height: record.height == null ? null : Number(record.height),
  }
}

/** The attachments by the id of the message they belong to, in the order they were added. */
export const attachmentsByMessage = (attachments: readonly Attachment[]) => {
  const byMessage = new Map<number, Attachment[]>()
  for (const attachment of [...attachments].sort((a, b) => a.id - b.id)) byMessage.set(attachment.message_id, [...(byMessage.get(attachment.message_id) ?? []), attachment])
  return byMessage
}

/** The images a browser draws, which the chat shows as a preview; the API serves them inline. */
const previewTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'])

/** Whether the chat shows the attachment as an image rather than as a file to download. */
export const isPreviewed = (attachment: Pick<Attachment, 'type' | 'url'>) => attachment.url !== undefined && previewTypes.has(attachment.type)

const sizeUnits = [
  { unit: 'byte', bytes: 1 },
  { unit: 'kilobyte', bytes: 1e3 },
  { unit: 'megabyte', bytes: 1e6 },
  { unit: 'gigabyte', bytes: 1e9 },
] as const

/** A file's size in the largest decimal unit it reaches, as the API's limits count them: `191 bytes`, `48 kB`, `1.5 MB`. */
export const formatSize = (bytes: number, locale?: string) => {
  const { unit, bytes: per } = sizeUnits.findLast((each) => bytes >= each.bytes) ?? sizeUnits[0]
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: unit === 'byte' ? 'long' : 'short', maximumFractionDigits: 1 }).format(bytes / per)
}

/** Why a file cannot be shared before it is uploaded, or undefined when it can. */
export const refusalOf = (file: { name: string; size: number }, locale?: string) => {
  if (file.size > maxFileBytes) return `${file.name} is ${formatSize(file.size, locale)}: a file may be at most ${formatSize(maxFileBytes, locale)}.`
  return
}

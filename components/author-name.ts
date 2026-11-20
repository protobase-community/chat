import type { TitleReader } from '@protobase/ui'

/**
 * A message's title for its reader, as search results and its list show it: its author's name. Nothing while the name
 * is not known yet, so the record shows its key until the members load. A `TitleRule`.
 */
export const authorName = (record: Record<string, unknown>, { member }: { member: TitleReader['member'] }) => member(String(record.author_id))?.name

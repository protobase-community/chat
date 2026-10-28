import type { TitleReader } from '@protobase/ui'

/**
 * A direct message's title for the person reading it: the names of the other people in it, in the order they were
 * added. Nothing while a name is not known yet, so the record shows its key until the members load. A `TitleRule`, which
 * the chat's header calls too, with the signed-in user.
 */
export const memberNames = (record: Record<string, unknown>, { user, member }: { user: { id: string } | undefined; member: TitleReader['member'] }) => {
  const ids = Array.isArray(record.member_ids) ? (record.member_ids as string[]) : []
  const names = ids.filter((id) => id !== user?.id).map((id) => member(id)?.name)
  if (names.length === 0 || !names.every(Boolean)) return
  return names.join(', ')
}

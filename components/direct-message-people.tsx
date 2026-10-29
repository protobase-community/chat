import { StatusMark, useMembers, useSignedInUser } from '@protobase/ui'
import { PresenceDot } from './presence-dot'
import { useWorkspacePresence } from './use-workspace-presence'

type Props = { memberIds: readonly string[]; /** Shown while the names load. */ fallback: string }

/**
 * The other people of a direct message by name, each with their presence dot and the status they set beside it, as
 * Protobase's `StatusMark` draws it: the text in full for one person, on hover for several, where room is short.
 */
export const DirectMessagePeople = ({ memberIds, fallback }: Props) => {
  const me = useSignedInUser()?.id
  const { member } = useMembers()
  const presence = useWorkspacePresence()
  const others = memberIds.filter((id) => id !== me)
  if (others.length === 0 || !others.every((id) => member(id))) return fallback
  return others.map((id, index) => {
    const person = member(id)!
    const activity = presence?.get(id)
    return (
      <span key={id} className="inline-flex min-w-0 items-center gap-1.5">
        {person.name}
        <StatusMark status={person.status} presence={activity && <PresenceDot activity={activity} />} textShown={others.length === 1 ? 'full' : 'hover'} />
        {index < others.length - 1 && ','}
      </span>
    )
  })
}

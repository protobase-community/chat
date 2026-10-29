import { useMembers, useSignedInUser } from '@protobase/ui'
import { typingIn, typingLine, type Typers } from './typing'

type Props = { typers: Typers; /** The thread whose typers show, null for the conversation outside threads. */ thread: number | null }

/**
 * The line above a composer saying who else types there, by name, or several people; empty, though it keeps its
 * height, while nobody does, so the composer does not move.
 */
export const TypingLine = ({ typers, thread }: Props) => {
  const me = useSignedInUser()?.id
  const { member } = useMembers()
  const names = typingIn(typers, thread, Date.now(), me).map((id) => member(id)?.name ?? 'Someone')
  return (
    <p className="h-5 truncate px-1 text-xs text-muted-foreground" aria-live="polite">
      {typingLine(names)}
    </p>
  )
}

import { heldStatus, type PersonStatus } from '@protobase/client'
import type { Activity } from './presence'

/** The words of a person's activity, as Protobase's presence dot names it. */
export const activityLabels: Record<Activity, string> = { online: 'Online', away: 'Away' }

/** The words of a set availability, as Protobase's status picker names them; automatic says nothing. */
const availabilityLabels: Record<PersonStatus['availability'], string | undefined> = { automatic: undefined, busy: 'Busy', do_not_disturb: 'Do not disturb' }

type Status = Pick<PersonStatus, 'availability' | 'text' | 'clearsAt'>

/** A person's activity and the status they set that holds at `now`, in words, such as "Online, Busy, Having lunch"; nothing for neither. */
export const personLabel = (activity: Activity | undefined, status: Status | null | undefined, now: number) => {
  const held = heldStatus(status, now)
  const parts = [activity && activityLabels[activity], held && availabilityLabels[held.availability], held?.text ?? undefined].filter(Boolean)
  return parts.length === 0 ? undefined : parts.join(', ')
}

type Person = { name: string; activity: Activity | undefined; status: Status | undefined }

/**
 * A group direct message's people in words, for the sidebar's tooltip: each person's name with their activity and
 * status, such as "Sam Okafor: Online; Lena Novak: Away, On vacation". Nothing when nobody has either.
 */
export const groupLabel = (others: readonly Person[], now: number) => {
  const told = others.flatMap((person) => {
    const label = personLabel(person.activity, person.status, now)
    return label === undefined ? [] : [`${person.name}: ${label}`]
  })
  return told.length === 0 ? undefined : told.join('; ')
}

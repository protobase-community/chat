import { heldStatus, type PersonStatus } from '@protobase/client'
import type { Activity } from './presence'

/** The words of a person's activity, as the presence dot names it. */
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
 * A direct message's people in words, for the sidebar's tooltip: the one other person's activity and status alone, or
 * each person's name with theirs, such as "Sam Okafor: Online; Lena Novak: Away, On vacation". Nothing when nobody
 * has either.
 */
export const directMessageLabel = (others: readonly Person[], now: number) => {
  const described = others.map((person) => ({ name: person.name, label: personLabel(person.activity, person.status, now) }))
  if (others.length === 1) return described[0]!.label
  const told = described.filter((person) => person.label !== undefined)
  return told.length === 0 ? undefined : told.map((person) => `${person.name}: ${person.label}`).join('; ')
}

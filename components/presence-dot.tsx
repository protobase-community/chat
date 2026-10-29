import { activityLabels } from './person-status'
import type { Activity } from './presence'

const looks: Record<Activity, string> = {
  online: 'inline-block size-2 shrink-0 rounded-full bg-success',
  away: 'inline-block size-2 shrink-0 rounded-full border border-muted-foreground',
}

/** The dot of a person's presence, filled while online and hollow while away, named for screen readers and on hover. */
export const PresenceDot = ({ activity }: { activity: Activity }) => (
  <span role="img" aria-label={activityLabels[activity]} title={activityLabels[activity]} className={looks[activity]} />
)

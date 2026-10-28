import { chatDayLabel } from '@protobase/ui'

/** A thread's number of replies: "1 reply", "3 replies". */
export const replyCountLabel = (count: number) => (count === 1 ? '1 reply' : `${count} replies`)

/** When a thread's last reply came, sent at `time`: "Last reply Today, 10:42", in the viewer's zone unless given. */
export const lastReplyLabel = (time: string, now = Date.now(), zone?: string) => {
  const clock = new Date(time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: zone })
  return `Last reply ${chatDayLabel(time, now, zone)}, ${clock}`
}

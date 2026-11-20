import type { AppAddress } from '@protobase/schema'
import { AppLink, buttonClass } from '@protobase/ui'
import { lastReplyLabel, replyCountLabel } from './reply-labels'

type Props = { count: number; lastReplyAt: string | null; to: AppAddress }

/** Under a thread's first message in the conversation: its number of replies, a link to the thread, and the last one's time. */
export const ThreadSummary = ({ count, lastReplyAt, to }: Props) => (
  <div className="flex items-center gap-2">
    <AppLink to={to} className={`${buttonClass({ size: 'sm', variant: 'ghost' })} -ml-2`}>
      {replyCountLabel(count)}
    </AppLink>
    {lastReplyAt && (
      <time dateTime={lastReplyAt} title={new Date(lastReplyAt).toLocaleString()} className="text-xs text-muted-foreground">
        {lastReplyLabel(lastReplyAt)}
      </time>
    )}
  </div>
)

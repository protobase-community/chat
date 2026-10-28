import { Button } from '@protobase/ui'
import { lastReplyLabel, replyCountLabel } from './reply-labels'

type Props = { count: number; lastReplyAt: string | null; onOpen: () => void }

/** Under a thread's first message in the conversation: its number of replies, which opens the thread, and the last one's time. */
export const ThreadSummary = ({ count, lastReplyAt, onOpen }: Props) => (
  <div className="flex items-center gap-2">
    <Button size="sm" variant="ghost" className="-ml-2" onClick={onOpen}>
      {replyCountLabel(count)}
    </Button>
    {lastReplyAt && (
      <time dateTime={lastReplyAt} title={new Date(lastReplyAt).toLocaleString()} className="text-xs text-muted-foreground">
        {lastReplyLabel(lastReplyAt)}
      </time>
    )}
  </div>
)

import type { ReactNode } from 'react'
import { AppLink, buttonClass, CallMark, useLayoutRecord } from '@protobase/ui'
import { standardPage } from './standard-page'

type Props = { title: ReactNode; topic?: string }

/**
 * The slim row over a conversation: its title as the sidebar shows it, a direct message's people with their presence
 * and status, a channel's topic beside it, its call (Start call, or the call in progress with Join), and a link to the
 * conversation's standard page, where its details, members, Edit and Delete are.
 */
export const ConversationHeader = ({ title, topic }: Props) => {
  const { model, key } = useLayoutRecord()!
  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <h1 className="flex min-w-0 items-center gap-2 truncate font-medium">{title}</h1>
      {topic && <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{topic}</p>}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <CallMark resource={model.name} recordKey={key} />
        <AppLink to={standardPage({ model, key })} className={buttonClass({ variant: 'ghost', size: 'sm' })}>
          Details
        </AppLink>
      </div>
    </div>
  )
}

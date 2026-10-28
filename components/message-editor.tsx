import { useState, type KeyboardEvent } from 'react'
import { Button, MentionBox, mentionedIds, useMembers, type MentionDraft } from '@protobase/ui'
import type { Message } from './message'
import { peopleMatching, type Person } from './people'

type Props = {
  message: Message
  member: (id: string) => Person | undefined
  onSave: (body: string, mentions: string[]) => void
  onCancel: () => void
}

/**
 * A message's text in a box to change it, its mentions kept while their `@{name}` stays: Enter or Save keeps the trimmed
 * text, Shift+Enter starts a new line, Escape or Cancel leaves it as it was. An empty text is no edit: deleting is. A
 * message of files alone starts empty, to give it a text.
 */
export const MessageEditor = ({ message, member, onSave, onCancel }: Props) => {
  const { data: members = [] } = useMembers()
  const picked = message.mentions.flatMap((id) => {
    const name = member(id)?.name
    return name ? [{ id, name }] : []
  })
  const [draft, setDraft] = useState<MentionDraft>({ text: message.body ?? '', picked })
  const text = draft.text.trim()
  const save = () => {
    if (text === '') return
    if (text === message.body) return onCancel()
    onSave(text, mentionedIds(text, draft.picked))
  }
  const keys = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') return onCancel()
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    save()
  }
  return (
    <div className="flex flex-col gap-2">
      <MentionBox value={draft} onChange={setDraft} searchPeople={async (query) => peopleMatching(members, query)} onKeyDown={keys} aria-label="Edit the message" autoFocus />
      <div className="flex gap-2">
        <Button size="sm" variant="primary" disabled={text === ''} onClick={save}>
          Save
        </Button>
        <Button size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

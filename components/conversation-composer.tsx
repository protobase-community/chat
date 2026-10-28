import { Composer, useMembers } from '@protobase/ui'
import { AttachmentPicker } from './attachment-picker'
import { PendingAttachments } from './pending-attachments'
import { peopleMatching } from './people'
import { useAttachmentUploads } from './use-attachment-uploads'

type Props = {
  placeholder: string
  /** Gets the text, or undefined for files alone, the ids of the people it mentions, and the files' upload tickets. */
  onSend: (text: string | undefined, mentions: string[], files: string[]) => void
}

/**
 * The box to write in a conversation, where `@` lists the workspace's members to mention, with a button beside it to
 * attach files. Picked files upload at once and show above the box; the message waits for their uploads and carries
 * them, and "Send without text" sends them alone, since the box sends only text.
 */
export const ConversationComposer = ({ placeholder, onSend }: Props) => {
  const { data: members = [] } = useMembers()
  const files = useAttachmentUploads()
  const searchPeople = async (query: string) => peopleMatching(members, query)
  const send = (text: string | undefined, mentions: string[]) => {
    onSend(text, mentions, files.tickets)
    files.clear()
  }
  const filesAlone = !files.uploading && files.tickets.length > 0 ? () => send(undefined, []) : undefined
  return (
    <div className="flex flex-col gap-2">
      {files.uploads.length > 0 && <PendingAttachments uploads={files.uploads} onRemove={files.remove} onSendFiles={filesAlone} />}
      <div className="flex items-end gap-2">
        <AttachmentPicker onPick={files.pick} />
        <div className="min-w-0 flex-1">
          <Composer placeholder={placeholder} onSend={send} busy={files.uploading} searchPeople={searchPeople} />
        </div>
      </div>
    </div>
  )
}

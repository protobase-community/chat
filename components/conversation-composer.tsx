import { Composer, useMembers } from '@protobase/ui'
import { AttachmentPicker } from './attachment-picker'
import { PendingAttachments } from './pending-attachments'
import { peopleMatching } from './people'
import { hasFilesToSend } from './upload'
import { useAttachmentUploads } from './use-attachment-uploads'
import { useTypingInput } from './use-typing-input'

type Props = {
  placeholder: string
  /** Gets the text, or undefined for files alone, the ids of the people it mentions, and the files' upload tickets. */
  onSend: (text: string | undefined, mentions: string[], files: string[]) => void
  /**
   * Gets that the reader types, at most once every few seconds, and that they stopped, when they empty the box or send;
   * answers whether it could tell.
   */
  onTyping?: (typing: boolean) => boolean
}

/**
 * The box to write in a conversation, where `@` lists the workspace's members to mention, with a button in it to attach
 * files. Picked, pasted and dropped files upload at once and show above the box; the message waits for their uploads and
 * carries them, and once one is uploaded the message may go without text. It tells `onTyping` as the reader writes.
 */
export const ConversationComposer = ({ placeholder, onSend, onTyping }: Props) => {
  const { data: members = [] } = useMembers()
  const files = useAttachmentUploads()
  const typing = useTypingInput(onTyping)
  const searchPeople = async (query: string) => peopleMatching(members, query)
  const send = (text: string, mentions: string[]) => {
    onSend(text === '' ? undefined : text, mentions, files.tickets)
    files.clear()
    typing.onSent()
  }
  return (
    <Composer
      placeholder={placeholder}
      inputRef={typing.inputRef}
      onSend={send}
      busy={files.uploading}
      searchPeople={searchPeople}
      actions={<AttachmentPicker onPick={files.pick} />}
      attachments={files.uploads.length > 0 && <PendingAttachments uploads={files.uploads} onRemove={files.remove} />}
      canSendEmpty={hasFilesToSend(files.uploads)}
      onFiles={files.pick}
    />
  )
}

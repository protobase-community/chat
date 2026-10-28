import { toAttachment } from './attachment'
import { useMessageRecords } from './use-message-records'

/**
 * The files shared in the messages `messageIds` names, the thread's loaded ones. A message's files are written with it
 * and deleted with it, so reading them once it shows is enough: they need no live stream of their own.
 */
export const useMessageAttachments = (messageIds: readonly number[]) => {
  const { records, error } = useMessageRecords('attachments', messageIds, toAttachment, { follow: false })
  return { attachments: records, error }
}

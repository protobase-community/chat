import { RecordCall, useLayoutRecord } from '@protobase/ui'
import { callUrl } from '../config/conversations/call-address'

type Props = { className?: string }

/**
 * The conversation's call, Protobase's call view, while its page joins it (`?call=join`, as Start call, Join and a
 * ring's Accept open it), and nothing otherwise. Everyone in it shows by the name functions/call.ts joins them with.
 */
export const ConversationCall = ({ className }: Props) => {
  const { model, key } = useLayoutRecord()!
  return <RecordCall resource={model.name} recordKey={key} url={callUrl(model.name, key)} {...(className && { className })} />
}

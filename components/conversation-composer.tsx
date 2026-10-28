import { Composer, useMembers } from '@protobase/ui'
import { peopleMatching } from './people'

/** The box to write in a conversation, where `@` lists the workspace's members to mention. */
export const ConversationComposer = ({ placeholder, onSend }: { placeholder: string; onSend: (text: string, mentions: string[]) => void }) => {
  const { data: members = [] } = useMembers()
  const searchPeople = async (query: string) => peopleMatching(members, query)
  return <Composer placeholder={placeholder} onSend={onSend} searchPeople={searchPeople} />
}

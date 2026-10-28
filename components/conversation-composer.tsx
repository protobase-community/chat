import { Composer, useMembers } from '@protobase/ui'
import { peopleMatching } from './people'

/** The box to write in a channel, where `@` lists the workspace's members to mention. */
export const ChannelComposer = ({ name, onSend }: { name: string; onSend: (text: string, mentions: string[]) => void }) => {
  const { data: members = [] } = useMembers()
  const searchPeople = async (query: string) => peopleMatching(members, query)
  return <Composer placeholder={`Message #${name}`} onSend={onSend} searchPeople={searchPeople} />
}

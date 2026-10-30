/** The resources whose records have calls: channels and direct messages. */
export const callResources = ['channels', 'direct_messages'] as const
export type CallResource = (typeof callResources)[number]

/** The query parameters of a conversation's call socket, which functions/call.ts serves. */
export const callParams = { resource: 'resource', key: 'key' } as const

/** The call socket of the conversation `resource`/`key`, as `joinCall` and Protobase's call view open it. */
export const callUrl = (resource: string, key: string) =>
  `/api/functions/call?${new URLSearchParams({ [callParams.resource]: resource, [callParams.key]: key })}`

const isCallResource = (resource: string | null): resource is CallResource => callResources.some((each) => each === resource)

/** The conversation a call socket's address names; undefined for a resource without calls or no key. */
export const conversationOfCall = (url: URL) => {
  const resource = url.searchParams.get(callParams.resource)
  const key = url.searchParams.get(callParams.key)
  if (!isCallResource(resource) || !key) return
  return { resource, key }
}

/** The API function that admits people to each conversation resource's call, which its conversation page names. */
export const callFunctions = { channels: 'channel-call', direct_messages: 'direct-message-call' } as const
export type CallResource = keyof typeof callFunctions

/** The query parameter of a call socket that holds its conversation's key, as the conversation page opens it. */
export const callKeyParam = 'key'

/** The call socket of the conversation `resource`/`key`, as its conversation page opens it. */
export const callUrl = (resource: CallResource, key: string) =>
  `/api/functions/${callFunctions[resource]}?${new URLSearchParams({ [callKeyParam]: key })}`

/** The conversation key a call socket's address names; undefined without one. */
export const keyOfCall = (url: URL) => url.searchParams.get(callKeyParam) || undefined

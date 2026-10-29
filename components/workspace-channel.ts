import { isApiError, type Client } from '@protobase/client'

/** The workspace's record, once per client: one entry, the client's, kept as long as the client is. */
const keys = new WeakMap<Client, Promise<string>>()

const findOrAdd = async (client: Client) => {
  // The tenant rule lists the session's own workspace's record alone.
  const found = await client.list('workspaces', { pageSize: 1 })
  const first = found.items[0]
  if (first) return String(first.organization_id)
  const added = await client.create('workspaces', {}).catch(async (error: unknown) => {
    // Another page of the workspace added it first.
    if (isApiError(error) && error.status === 409) return
    throw error
  })
  if (added) return String(added.record.organization_id)
  const again = await client.list('workspaces', { pageSize: 1 })
  if (!again.items[0]) throw new Error('The workspace record was added by another page but cannot be read')
  return String(again.items[0].organization_id)
}

/**
 * The key of the session's workspace record, whose channel carries its members' presence: read once per client, and
 * added the first time a member of a new workspace opens the chat. A failed read is not kept, so the next call tries again.
 */
export const workspaceKey = (client: Client) => {
  const known = keys.get(client)
  if (known) return known
  const key = findOrAdd(client)
  keys.set(client, key)
  key.catch(() => keys.delete(client))
  return key
}

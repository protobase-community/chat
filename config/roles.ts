import { defineRoles } from '@protobase/schema'

/**
 * A workspace's participants read and start its channels and direct messages and post in them; the access rules of
 * config/channels/data.ts and config/direct_messages/data.ts keep private ones to their members. Nobody edits or
 * deletes a message yet, so no role holds those capabilities but the superuser's `*`.
 */
export const roles = defineRoles<'channels' | 'direct_messages' | 'messages'>({
  admin: ['*'],
  participant: ['channels.read', 'channels.create', 'direct_messages.read', 'direct_messages.create', 'messages.read', 'messages.create'],
})

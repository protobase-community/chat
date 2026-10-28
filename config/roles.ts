import { defineRoles } from '@protobase/schema'

/**
 * A workspace's participants read and start its channels and direct messages and post in them; the access rules of
 * config/channels/data.ts and config/direct_messages/data.ts keep private ones to their members, and those of
 * config/read_positions/data.ts each read position to its person. Nobody edits or deletes a message yet, so no role
 * holds those capabilities but the superuser's `*`.
 */
export const roles = defineRoles<'channels' | 'direct_messages' | 'messages' | 'read_positions'>({
  admin: ['*'],
  participant: ['channels.read', 'channels.create', 'direct_messages.read', 'direct_messages.create', 'messages.read', 'messages.create', 'read_positions.read', 'read_positions.create', 'read_positions.update'],
})

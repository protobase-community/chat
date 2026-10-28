import { defineRoles } from '@protobase/schema'

/**
 * A workspace's participants read and start its channels and direct messages and post in them; the access rules of
 * config/channels/data.ts and config/direct_messages/data.ts keep private ones to their members, and those of
 * config/read_positions/data.ts each read position to its person. Those of config/messages/data.ts and
 * config/reactions/data.ts let each person edit and delete only their own messages and take back only their own reactions,
 * and those of config/attachments/data.ts each person share files only in their own messages.
 */
export const roles = defineRoles<'attachments' | 'channels' | 'direct_messages' | 'messages' | 'reactions' | 'read_positions'>({
  admin: ['*'],
  participant: ['channels.read', 'channels.create', 'direct_messages.read', 'direct_messages.create', 'messages.read', 'messages.create', 'messages.update', 'messages.delete', 'reactions.read', 'reactions.create', 'reactions.delete', 'read_positions.read', 'read_positions.create', 'read_positions.update', 'attachments.read', 'attachments.create', 'attachments.delete'],
})

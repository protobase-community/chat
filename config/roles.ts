import { defineRoles } from '@protobase/schema'

/** What everyone in a workspace does, a moderator too, since a session acts with one role at a time. */
const participating = ['channels.read', 'channels.create', 'direct_messages.read', 'direct_messages.create', 'messages.read', 'messages.create', 'messages.update', 'reactions.read', 'reactions.create', 'reactions.delete', 'read_positions.read', 'read_positions.create', 'read_positions.update', 'attachments.read', 'attachments.create', 'workspaces.read', 'workspaces.create'] as const

/**
 * A workspace's participants read and start its channels and direct messages and post in them; the access rules of
 * config/channels/data.ts and config/direct_messages/data.ts keep private ones to their members, and those of
 * config/read_positions/data.ts each read position to its person. Those of config/messages/data.ts and
 * config/reactions/data.ts let each person edit only their own messages and take back only their own reactions,
 * those of config/attachments/data.ts each person share files only in their own messages, and those of
 * config/workspaces/data.ts each person read and add only their own workspace's record. A participant deletes
 * their own messages and files (`.own`, by `.owner()`), and a moderator, a workspace's owners and the admins they
 * pick, any they read, never editing them.
 */
export const roles = defineRoles<'attachments' | 'channels' | 'direct_messages' | 'messages' | 'reactions' | 'read_positions' | 'workspaces'>({
  admin: ['*'],
  participant: [...participating, 'messages.delete.own', 'attachments.delete.own'],
  moderator: [...participating, 'messages.delete', 'attachments.delete'],
})

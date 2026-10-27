import { defineRoles } from '@protobase/schema'

/**
 * A workspace's participants read and start its channels and post in them. Nobody edits or deletes a message yet, so no
 * role holds those capabilities but the superuser's `*`.
 */
export const roles = defineRoles<'channels' | 'messages'>({
  admin: ['*'],
  participant: ['channels.read', 'channels.create', 'messages.read', 'messages.create'],
})

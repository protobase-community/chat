import { defineConfig } from '@protobase/config'

// The whole app, as one object. Its resources are in config/ and its roles in config/roles.ts; its address and secret
// are Protobase's defaults, PROTOBASE_URL and PROTOBASE_SECRET (see .env.example).
export default defineConfig({
  name: 'Chat',
  auth: {
    // `admin` is the superuser, in every workspace; `participant` is held per workspace, given with each invitation, and
    // `moderator` too, which a workspace's creator holds and gives to its admins: it deletes anyone's messages there.
    roles: { admin: 'Superuser', participant: 'Participant', moderator: 'Moderator' },
    // A workspace is an organization: people join one by invitation and see only its channels and messages.
    organizations: { create: 'everyone' },
  },
  // No PostgREST-compatible API: it runs under the tables' row-level security, which these tables do not have, rather
  // than the resources' access rules, so a key set in the environment must not turn it on.
  apiKeys: false,
  // The bell and browser push: config/messages/notify.ts tells people of the messages that mention them or write to them.
  notifications: {},
})

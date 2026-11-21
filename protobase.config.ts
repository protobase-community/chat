import { defineConfig } from '@protobase/config'

// The whole app, as one object. Its resources are in config/ and its roles in config/roles.ts; its address and secret
// are Protobase's defaults, PROTOBASE_URL and PROTOBASE_SECRET (see .env.example).
export default defineConfig({
  name: 'Chat',
  auth: {
    // `admin` is the superuser, in every workspace; `participant` is held per workspace, given with each invitation, and
    // `moderator` too, which a workspace's creator holds and gives to its admins: it deletes anyone's messages there.
    roles: { admin: 'Superuser', participant: 'Participant', moderator: 'Moderator' },
    // A workspace is an organization: people join one by invitation and see only its channels and messages. Someone in
    // none names their first on one screen, then lands in its #general (the Channels entry's start record).
    organizations: {
      create: 'everyone',
      names: { singular: 'Workspace', plural: 'Workspaces' },
      createDescription: 'A workspace holds your team’s channels and direct messages. Next, you land in #general.',
    },
  },
  // No PostgREST-compatible API: it runs under the tables' row-level security, which these tables do not have, rather
  // than the resources' access rules, so a key set in the environment must not turn it on.
  apiKeys: false,
  // The bell and browser push: config/messages/notify.ts tells people of the messages that mention them or write to them.
  notifications: {},
  // "Set a status" in the user menu: busy, do not disturb or a text such as "Having lunch", which the workspace sees beside
  // the person's name; do not disturb holds their push notifications, keeping them in the bell.
  status: {},
  // Voice and video calls in channels and direct messages, joined through functions/call.ts, straight between the
  // browsers: no media server. Without a STUN server in `iceServers`, only browsers on the same network connect.
  calls: { backend: { kind: 'peer' } },
})

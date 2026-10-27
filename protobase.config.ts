import { defineConfig } from '@protobase/config'

// The whole app, as one object. Its resources are in config/ and its roles in config/roles.ts; its address and secret
// are Protobase's defaults, PROTOBASE_URL and PROTOBASE_SECRET (see .env.example).
export default defineConfig({
  name: 'Chat',
  auth: {
    // `admin` is the superuser, in every workspace; `participant` is held per workspace, given with each invitation.
    roles: { admin: 'Superuser', participant: 'Participant' },
    // A workspace is an organization: people join one by invitation and see only its channels and messages.
    organizations: { create: 'everyone' },
  },
})

# Chat

A team chat app built on Protobase: a team signs in to its workspace, talks in channels, and sees each other's
messages arrive live, with @mentions. Start from it for a chat of your own, or read it to see how Protobase builds one:
everything below is Protobase's own features, with no server code of the app's own.

## Run it locally

You need [Bun](https://bun.sh) 1.4 and Docker.

```sh
bun install
bun run db:up                     # Postgres 18 in Docker on port 55432; creates .env from .env.example
bun run db:migrate
bun run protobase users create you@example.com --role admin --generate-password
bun run seed                      # the demo workspace: #general, #random, three people and their conversation
bun run dev                       # http://localhost:5173
```

The seed prints the passwords of the three demo people (`maya@example.com`, `sam@example.com` and
`lena@example.com`), once, when it creates them: sign in as two of them in two browsers to chat. It runs again
without doubling anything, and needs your own account first, since the first account is always the superuser. Set your
own `PROTOBASE_SECRET` in `.env` (`openssl rand -base64 32`). `bun run db:down` stops the database.

Check a change with `bun run typecheck`, `bun run test`, `bun run build` and, after `bun run db:migrate`,
`bun run doctor`, as CI does. The tests in `test/` make a database of their own on `DATABASE_URL`'s server and run the
app on it with `protobase dev`.

## What it does

| Feature | Where it comes from | Here |
| --- | --- | --- |
| Workspaces, joined by invitation, each seeing only its own channels | Slack workspaces, Teams teams, Discord servers | This version |
| Channels with a name and a topic, open to the whole workspace | Slack and Teams channels, Discord text channels | This version |
| Messages with the author's name, avatar and time, one person's run of messages grouped | Slack, Teams, Discord | This version |
| Day dividers: "Today", "Yesterday", the date | Slack, Teams, WhatsApp, Discord | This version |
| New messages arrive live; a reader who scrolled back keeps their place, sending jumps to the end | Slack, Teams, WhatsApp, Discord | This version |
| "Load earlier messages", keeping the reader's place | Slack, Teams, WhatsApp, Discord | This version |
| A composer of several lines: Enter sends, Shift+Enter adds a line | Slack, Teams, Discord | This version |
| @mentions of the workspace's members, picked out in the message | Slack, Teams, Discord | This version |
| Direct messages and private channels | Slack, Teams, WhatsApp, Discord | Next: the first follow-up |
| Unread conversations and the "New messages" line | Slack, Teams, WhatsApp, Discord | The second follow-up |
| Notifications for mentions and direct messages | Slack, Teams, WhatsApp, Discord | The third follow-up |
| Editing, deleting and reacting to messages | Slack, Teams, WhatsApp, Discord | The fourth follow-up |
| Files and images | Slack, Teams, WhatsApp, Discord | The fifth follow-up |
| Threads | Slack, Teams, Discord | The sixth follow-up |
| Message search, presence and typing indicators | Slack, Teams, WhatsApp, Discord | Later |
| Voice and video calls | Slack, Teams, WhatsApp, Discord | Later, once Protobase has calling |

<gap>Old messages of someone who has left the workspace cannot show their name because Protobase's lookup of former members is not implemented.</gap>

## How Protobase builds it

- **Workspaces are organizations.** `auth.organizations` in `protobase.config.ts` turns on Protobase's
  [organizations](https://docs.protobase.net/reference/auth/#organizations): people work in one at a time, are invited
  from its own **Members** and **Invitations** pages in the profile menu, and sign in with its own sign-in page. Give
  an invited person the **Participant** role, which `config/roles.ts` lets read and start channels and post in them.
  `create: 'everyone'` lets anyone signed in start a workspace of their own.
- **Each workspace sees only its own.** Channels and messages declare `.tenant((r) => r.organization_id)`
  ([data config](https://docs.protobase.net/reference/data-config/#resource)): every read is limited to the workspace
  the session works in, and every create is stamped with it; no request may set it.
- **Nobody posts as someone else.** `.author((r) => r.author_id)` on channels and messages stamps the signed-in person's
  id on every create, and refuses a request that names the author.
- **A message goes only into a channel its author may read.** `.parent((r) => r.channel_id, 'read')` on messages checks
  the channel with the poster's own access, so a channel of another workspace, or one that does not exist, is refused
  with the same `403` ([records that belong to another](https://docs.protobase.net/reference/access/#records-that-belong-to-another)).
- **Live updates.** `.live()` on channels and messages, with the jobs schema and change capture that
  `protobase migration` wrote (`db/migrations/008_jobs.sql` and `009_changes.sql`), tells each open page which records
  changed, only of its own workspace; the chat follows the stream with `client.live` and reads the new messages through
  the API ([live updates](https://docs.protobase.net/reference/live/)).
- **The chat parts.** The channel's page is built from Protobase's
  [chat parts](https://docs.protobase.net/reference/custom-components/#chat-parts): `ChatThread`, which keeps the
  reader's place, goes to the end when they send (`followKey`) and offers earlier messages (`onLoadEarlier`);
  `ChatMessage` with the author, avatar, time and `continued` for a run of one person's messages; `ChatDivider` with
  `chatDayLabel` between messages that `sameChatDay` puts on different days; and `Composer`, whose `searchPeople` lists
  the members to mention and whose `onSend(text, mentionIds)` gives the ids each message keeps in `mentions`, for the
  unread and notification follow-ups. `components/` holds the page's own code: paging and following a channel's
  messages (`use-channel-messages.ts`), grouping them (`thread-rows.ts`) and drawing them (`channel-chat.tsx`),
  exported from `protobase.ui.tsx`.
- **Names from the workspace's members.** A message stores its author and mentions as user ids;
  [`useMembers()`](https://docs.protobase.net/reference/custom-components/#members-names) gives the members of the
  workspace, by name and without their addresses, for the authors, the mentions and the people `@` lists (at most 8).
- **The chat on the channel's page.** `l.custom(ChannelChat)` in `config/channels/ui.ts` puts the chat on the channel's
  record page, with `.recordMode('read')` so the page reads as a chat and **Edit** changes the name and topic, and
  `nav({ recent: { orderBy: 'name asc', limit: 20 } })` lists the channels under the sidebar's Channels entry
  ([recent records](https://docs.protobase.net/reference/sidebar/#recent-records)).
- **Records at their own address.** A channel is an ordinary record at `/channels/<id>`, created with the standard
  form (a name and an optional topic), so links and breadcrumbs work as for any record.
- **The demo seed** (`seed/`) creates its people and workspace with Protobase's host functions (`createUser`,
  `createOrganization`, `addMember`) and writes the channels and messages in one transaction.
- **No API around the rules.** `apiKeys: false` keeps the PostgREST-compatible API off: it runs under the tables'
  row-level security, which these tables do not have, rather than the resources' rules.

## Use it as a template

Press **Use this template** at the top of this page, then **Create a new repository**, to get your own copy with a
clean history. Clone it and run it as above. `AGENTS.md` holds the rules a coding agent follows when it changes the
app, and `bun run protobase skill install` gives it the Protobase docs of this version.

## Deploy it on Protobase Cloud

Push your copy to GitHub, then in the [console](https://console.protobase.net) press **New app** and pick **An existing
GitHub repository**. Protobase keeps the app in sync with the repository and deploys every push that passes
`db:migrate`, `typecheck`, `test` and doctor.

## Built with Protobase

[Protobase](https://github.com/PrototeamHQ/protobase) builds the app from a Postgres database and a typed config: each table's data config sits in
`config/<name>/data.ts` and its screens in `config/<name>/ui.ts`, all exported from `config/index.ts`, and
`protobase dev` and `protobase serve` serve the API and the app from them.

- Tested with Protobase **0.53.8**, and CI runs against it. The app is bundled: the `@protobase/*` packages are dev
  dependencies in the caret range of that release, and dev, the build and the `db:*` scripts (`protobase run`) use the
  CLI's own copies, so a newer CLI within the range updates the app with no change to its files. `tsconfig.json`
  extends the `.protobase/tsconfig.json` that `protobase types` writes, so the editor types the CLI's copies too. To
  move outside the range, set the new range on each `@protobase/*` package, run `bun install`, then
  `bun run typecheck`, `bun run test` and `bun run build`. The [release notes](https://github.com/PrototeamHQ/protobase/releases) say what changed.
  [Versioning](https://docs.protobase.net/reference/versioning/) says how bundled and locked apps differ.
- Docs: [docs.protobase.net](https://docs.protobase.net). Source and issues: [PrototeamHQ/protobase](https://github.com/PrototeamHQ/protobase).

## Contributing

Contributions are welcome, from a typo to a new screen: see [CONTRIBUTING.md](CONTRIBUTING.md). A problem in Protobase
itself goes to [Protobase's issues](https://github.com/PrototeamHQ/protobase/issues).

## Licence

[Apache License 2.0](LICENSE).

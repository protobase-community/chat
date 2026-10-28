# Chat

A team chat app built on Protobase: a team signs in to its workspace, talks in channels, private channels and direct
messages, and sees each other's messages arrive live, with @mentions. Start from it for a chat of your own, or read it to see how Protobase builds one:
everything below is Protobase's own features, with no server code of the app's own.

## Run it locally

You need [Bun](https://bun.sh) 1.4 and Docker.

```sh
bun install
bun run db:up                     # Postgres 18 in Docker on port 55432; creates .env from .env.example
bun run db:migrate
bun run protobase users create you@example.com --role admin --generate-password
bun run seed                      # the demo workspace: three people, their channels and direct message
bun run dev                       # http://localhost:5173
```

The seed prints the passwords of the three demo people (`maya@example.com`, `sam@example.com` and
`lena@example.com`), once, when it creates them: sign in as two of them in two browsers to chat. Maya and Sam share
the private #launch and a direct message, which Lena and your own account do not see. Your own account
joins the demo workspace as its admin, so you see the chat as a member too and can invite others from its Members page.
It runs again without doubling anything, and needs your own account first, since the first account is always the
superuser. Set your
own `PROTOBASE_SECRET` in `.env` (`openssl rand -base64 32`). `bun run db:down` stops the database.

Check a change with `bun run typecheck`, `bun run test`, `bun run build` and, after `bun run db:migrate`,
`bun run doctor`, as CI does. The tests in `test/` make a database of their own on `DATABASE_URL`'s server and run the
app on it with `protobase dev`.

## What it does

| Feature | Here |
| --- | --- |
| Workspaces, joined by invitation, each seeing only its own channels | This version |
| Channels with a name and a topic, open to the whole workspace | This version |
| Messages with the author's name, avatar and time, one person's run of messages grouped | This version |
| Day dividers: "Today", "Yesterday", the date | This version |
| New messages arrive live; a reader who scrolled back keeps their place, sending jumps to the end | This version |
| "Load earlier messages", keeping the reader's place | This version |
| A composer of several lines: Enter sends, Shift+Enter adds a line | This version |
| @mentions of the workspace's members, picked out in the message | This version |
| Private channels, which only their members see, read and post in; their creator adds and takes off members | This version |
| Direct messages between two or more people, under "Direct messages" and named after the other people | This version |
| Starting a direct message with the same people again opens the one they have | Next: the first follow-up |
| Unread conversations in bold in the sidebar, with a count of unread mentions, or of a direct message's unread messages, updated live | This version |
| Opening a conversation on a "New messages" line above the first unread message | This version |
| Notifications for mentions and direct messages | The third follow-up |
| Editing, deleting and reacting to messages | The fourth follow-up |
| Files and images | The fifth follow-up |
| Threads | The sixth follow-up |
| Message search, presence and typing indicators | Later |
| Voice and video calls | Later, once Protobase has calling |

<gap>Starting a direct message with the same people again cannot open the one they have because Protobase's create form opening the existing record on a duplicate is not implemented.</gap> The form refuses it as a duplicate, and the sidebar lists the one they have.

<gap>The sidebar cannot offer "New message" under Direct messages because a sidebar entry for a resource's create form is not implemented in Protobase.</gap> **New message** on the Direct messages list starts one.

<gap>The sidebar cannot mark more than a person's first 100 channels and 100 direct messages because unread counts over more conversations are not implemented.</gap>

<gap>A conversation with more unread messages than one page of 50 cannot show its "New messages" line because opening on a message before the latest page is not implemented.</gap> It opens at the end, still bold in the sidebar until read there.

<gap>Old messages of someone who has left the workspace cannot show their name because Protobase's lookup of former members is not implemented.</gap>

## How Protobase builds it

- **Workspaces are organizations.** `auth.organizations` in `protobase.config.ts` turns on Protobase's
  [organizations](https://docs.protobase.net/reference/auth/#organizations): people work in one at a time, are invited
  from its own **Members** and **Invitations** pages in the profile menu, and sign in with its own sign-in page. Give
  an invited person the **Participant** role, which `config/roles.ts` lets read and start channels and direct messages
  and post in them.
  `create: 'everyone'` lets anyone signed in start a workspace of their own.
- **Each workspace sees only its own.** Channels, direct messages and messages declare `.tenant((r) => r.organization_id)`
  ([data config](https://docs.protobase.net/reference/data-config/#resource)): every read is limited to the workspace
  the session works in, and every create is stamped with it; no request may set it.
- **Nobody posts as someone else.** `.author((r) => r.author_id)` on channels, direct messages and messages stamps the signed-in person's
  id on every create, and refuses a request that names the author.
- **A conversation has members.** A private channel and a direct message keep their members' user ids in `member_ids`,
  a JSON list with a GIN index. Their read rules are row filters, `roles.can('channels.read').and((ctx) =>
  where.or(where.eq('kind', 'public'), where.has('member_ids', ctx.user.id)))` on channels and `has(member_ids, me)` on
  direct messages ([access](https://docs.protobase.net/reference/access/#rules-that-read-the-record)), so a list, a get
  and the sidebar show someone only the conversations they are in, the superuser too, and a get of another's is the
  `404` of a key that does not exist. The `members` field type picks them on the standard forms and shows them by name
  ([members](https://docs.protobase.net/reference/plugins/#members)). The database adds the creator, so they are always
  a member, and only public channels' names are unique, so a refused name tells nothing about a private one.
- **Only its creator changes a private channel.** Its update rule is a row filter too: the roles that update channels
  change public ones, and a private one only its creator, who adds and takes off members; `kind` never changes.
- **A message stays with its conversation's members.** A message points at a channel or a direct message, exactly one.
  `.parent((r) => r.channel_id, 'read')` and `.parent((r) => r.direct_message_id, 'read')` on messages check the
  conversation with the caller's own access on every post and narrow every read to the conversations they read, so a
  non-member's list of a private one's messages is empty, a get is a `404` and a post a `403`, and someone taken off a
  private channel stops reading it at once
  ([records that belong to another](https://docs.protobase.net/reference/access/#records-that-belong-to-another)).
- **One direct message per set of people.** `direct_messages.member_key`, a column the database generates from the
  sorted members, is unique in a workspace, so starting one again with the same people is refused with a `409`.
- **Live updates.** `.live()` on channels, direct messages and messages, with the jobs schema and change capture that
  `protobase migration` wrote (`db/migrations/008_jobs.sql` and `009_changes.sql`), tells each open page which records
  changed, only of its own workspace and never their values; the chat follows the stream with `client.live` and reads
  the new messages through the API as its reader, so a private conversation's messages reach only its members ([live updates](https://docs.protobase.net/reference/live/)).
- **The chat parts.** A channel's and a direct message's page are built from Protobase's
  [chat parts](https://docs.protobase.net/reference/custom-components/#chat-parts): `ChatThread`, which keeps the
  reader's place, goes to the end when they send (`followKey`) and offers earlier messages (`onLoadEarlier`);
  `ChatMessage` with the author, avatar, time and `continued` for a run of one person's messages; `ChatDivider` with
  `chatDayLabel` between messages that `sameChatDay` puts on different days; and `Composer`, whose `searchPeople` lists
  the members to mention and whose `onSend(text, mentionIds)` gives the ids each message keeps in `mentions`, for the
  unread and notification follow-ups. `components/` holds the pages' own code: paging and following a conversation's
  messages (`use-conversation-messages.ts`), grouping them (`thread-rows.ts`) and drawing them
  (`conversation-chat.tsx`), on a channel's page (`channel-chat.tsx`) and a direct message's
  (`direct-message-chat.tsx`), exported from `protobase.ui.tsx`.
- **Names from the workspace's members.** A message stores its author and mentions as user ids;
  [`useMembers()`](https://docs.protobase.net/reference/custom-components/#members-names) gives the members of the
  workspace, by name and without their addresses, for the authors, the mentions and the people `@` lists (at most 8).
- **The chat on the channel's page.** `l.custom(ChannelChat)` in `config/channels/ui.ts` puts the chat on the channel's
  record page, under a private channel's members, with `.recordMode('read')` so the page reads as a chat and **Edit**
  changes the name, topic and members, and
  `nav({ recent: { orderBy: 'name asc', limit: 20 } })` lists the channels under the sidebar's Channels entry
  ([recent records](https://docs.protobase.net/reference/sidebar/#recent-records)).
- **Each reader's name for a direct message.** `.titleFrom('memberNames', (r) => [r.member_ids])` in
  `config/direct_messages/ui.ts` titles a direct message by the `memberNames` rule of `protobase.ui.tsx`
  (`components/member-names.ts`): the names of the other people in it, so Maya sees "Sam Okafor" and Sam "Maya Jansen",
  in the sidebar, the breadcrumb and the page's heading
  ([titles per reader](https://docs.protobase.net/reference/ui-config/#titles-per-reader)).
- **Unread, counted as each reader.** `read_positions` (`config/read_positions/data.ts`) keeps how far each person has
  read each conversation, the newest message id: its read and update rules are the row filter `user_id = me`, the
  superuser's too, `.author()` stamps the person, `.parent(..., 'read')` keeps it to a conversation they read, and a
  database trigger only moves it forward, so an older tab never marks read messages unread. The sidebar's
  `nav({ recent: { ..., marks: 'unread' } })` on channels and direct messages names the `unread` marks hook of
  `protobase.ui.tsx` ([marks per reader](https://docs.protobase.net/reference/sidebar/#marks-per-reader)),
  `components/use-unread-marks.ts`: as the signed-in person (`useSignedInUser()`), it lists their conversations and read
  positions and counts the messages after those by others with `client.aggregate('messages', { groupBy: 'channel_id' })`,
  once for the unread and once for those whose `mentions` hold them. The counts go through the messages API's own read
  rules, so a private conversation someone is not in never counts, and it counts again whenever the live stream tells
  of a message or read position changed. A conversation's page reads its position on opening and draws
  `ChatDivider tone="new"` above the first message after it by someone else, which `ChatThread` opens on; its
  `onReadToEnd` moves the position to the newest message once the reader is at the end while the page shows.
- **Records at their own address.** A channel is an ordinary record at `/channels/<id>` and a direct message at
  `/direct_messages/<id>`, each created with the standard form, so links and breadcrumbs work as for any record.
- **The demo seed** (`seed/`) creates its people and workspace with Protobase's host functions (`createUser`,
  `createOrganization`, `addMember`) and writes the channels, the direct message and the messages in one transaction.
- **No API around the rules.** `apiKeys: false` keeps the PostgREST-compatible API and its realtime off, even with keys
  in the environment: they run under the tables' grants and row-level security, which these tables do not have, rather
  than the resources' rules, so they would reach private conversations.

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

- Tested with Protobase **0.55.4**, and CI runs against it. The app is bundled: the `@protobase/*` packages are dev
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

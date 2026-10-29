# Chat

A team chat app built on Protobase: a team signs in to its workspace, talks in channels, private channels and direct
messages, and sees each other's messages arrive live, with @mentions, threads, shared files and images, and notifications of them,
who is online, away or busy, and who is typing. Start from it for a chat of your own, or read it to see how Protobase builds one:
everything below is Protobase's own features, with one piece of server code of the app's own, the subscription that
notifies people of messages.

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
joins the demo workspace as its admin and moderator, so you see the chat as a member too, can invite others from its
Members page, and can delete anyone's messages.
It runs again without doubling anything, keeping what you wrote, and needs your own account first, since the first
account is always the superuser. `bun run db:seed` resets the demo workspace instead, as the hosted demo does every
hour: every message, thread, reaction, file, read position, channel and direct message in it goes, yours too, and the
seed's come back as new. Other workspaces, the accounts and the workspace's members stay as they are. Set your
own `PROTOBASE_SECRET` in `.env` (`openssl rand -base64 32`): it also signs the files' upload tickets and download
links. Shared files are kept in `data/files/private`, which git ignores. `bun run db:down` stops the database.

Mention Sam as Maya, or write to Maya as Sam, and the other sees it in the bell in the top bar within a few seconds. In
#general, Sam's release notes have a thread: open it from **2 replies** under the message, reply in it as one of them,
and the other sees the count go up and, with the thread open, the reply arrive.
For push to the browser too, generate the Web Push keys and put them in `.env`, with an address push services can reach
you at, then start `bun run dev` again and press **Turn on** in the bell:

```sh
bun run protobase notifications vapid-keys   # prints PROTOBASE_VAPID_PUBLIC_KEY and PROTOBASE_VAPID_PRIVATE_KEY
```

```sh
PROTOBASE_VAPID_PUBLIC_KEY=...
PROTOBASE_VAPID_PRIVATE_KEY=...
PROTOBASE_VAPID_SUBJECT=mailto:you@example.com
```

Keep the private key out of the repository: anyone holding it can push to every subscribed browser. Without the keys
the bell still shows the notifications, and browsers get no push.

Check a change with `bun run typecheck`, `bun run test`, `bun run build` and, after `bun run db:migrate`,
`bun run doctor`, as CI does. The tests in `test/` make a database of their own on `DATABASE_URL`'s server and run the
app on it with `protobase dev`.

## What it does

| Feature | Here |
| --- | --- |
| Workspaces, joined by invitation, each seeing only its own channels | This version |
| Channels with a name and a topic, open to the whole workspace | This version |
| A conversation filling the page beside the sidebar: its messages scroll, the composer stays at the bottom, and a Details link opens its members, Edit and Delete | This version |
| Messages with the author's name, avatar and time, one person's run of messages grouped | This version |
| Day dividers: "Today", "Yesterday", the date | This version |
| New messages arrive live; a reader who scrolled back keeps their place, sending jumps to the end | This version |
| "Load earlier messages", keeping the reader's place | This version |
| A composer of several lines: Enter sends, Shift+Enter adds a line | This version |
| @mentions of the workspace's members, picked out in the message | This version |
| Private channels, which only their members see, read and post in; their creator adds and takes off members | This version |
| Direct messages between two or more people, under "Direct messages" and named after the other people | This version |
| Starting a direct message with the same people again opens the one they have | This version |
| Unread conversations in bold in the sidebar, with a count of unread mentions, or of a direct message's unread messages, updated live | This version |
| Opening a conversation on a "New messages" line above the first unread message | This version |
| Notifications of mentions and direct messages in the bell and as browser push, opening the conversation | This version |
| Editing and deleting one's own messages, "(edited)" under a changed one, both reaching others live | This version |
| Reacting with an emoji of a small set: each reaction's count under the message, who reacted on hover, one's own highlighted, live | This version |
| Files in messages, with or without text, picked with 📎, pasted, such as a screenshot, or dropped on the message box: images shown as previews, any other file as its name and size to download, at most 10 of up to 20 MB each | This version |
| Replying in a thread, in a panel beside the conversation, with mentions and files: the conversation shows under a message its number of replies and when the last came, both live | This version |
| Workspace moderators, its owners and the admins they pick, who delete anyone's message in a conversation they read, never edit it | This version |
| Who is online or away beside their name, in a direct message's header and on hover in the sidebar's direct messages: online while a page of theirs shows and was used in the last 10 minutes, several tabs counting as one | This version |
| "Set a status" in the profile menu: busy, do not disturb or a text such as "Having lunch", with when it clears, shown beside the name whether or not the person has a page open | This version |
| Do not disturb holds a person's push notifications, keeping them in the bell | This version |
| "Name is typing…" above the composer, and the thread's, while others write there | This version |
| Message search | Later |
| Voice and video calls | Later, once Protobase has calling |

<gap>The sidebar's direct messages cannot show the online, away or status mark beside a name because a mark with an element of the app's own in Protobase's sidebar is not implemented.</gap> Their tooltip says it, such as "Online, Busy, Having lunch", and so does the conversation's header.

<gap>The workspace's Members page cannot show who is online or away because a presence slot on Protobase's Members page is not implemented.</gap> It shows each member's set status.

<gap>The sidebar cannot mark more than a person's first 100 channels and 100 direct messages because unread counts over more conversations are not implemented.</gap>

<gap>A conversation with more unread messages than one page of 50 cannot show its "New messages" line because opening on a message before the latest page is not implemented.</gap> It opens at the end, still bold in the sidebar until read there.

<gap>Old messages of someone who has left the workspace cannot show their name because Protobase's lookup of former members is not implemented.</gap>

<gap>Phones cannot get push from the chat's own Android and iOS app because Protobase's push to them is not implemented.</gap> A browser gets it, and on iPhone the chat added to the Home Screen.

<gap>A conversation cannot be muted, nor a person's notifications paused, because notification settings are not implemented.</gap>

<gap>A message cannot notify a whole channel with @channel or @here because mentions of everyone in a conversation are not implemented.</gap>

<gap>Making someone a workspace admin cannot make them a moderator because app roles that follow the workspace role are not implemented.</gap> An owner gives them the Moderator role on the Members page.

<gap>A thread's first message cannot be deleted while it has replies because keeping a deleted message's place in its thread is not implemented.</gap> Its replies go first, each deleted by its author or a moderator, so nobody's replies are deleted with it.

<gap>A notification of a reply cannot open its thread because an address for a thread in its conversation's page is not implemented.</gap> It opens the conversation, where the thread's first message shows its replies.

<gap>Mentioning someone in an edit cannot notify them because notifying of edited messages is not implemented.</gap> The edit does count in their unread mentions.

<gap>A deleted message's notification cannot be taken back from the bell because withdrawing a sent notification is not implemented.</gap>

<gap>A message cannot be answered with any emoji outside the six of the set because an emoji picker is not implemented.</gap>

<gap>The message box cannot show that it takes the files dragged over it because a drop highlight in Protobase's `Composer` is not implemented.</gap> Dropping them on it still adds them.

<gap>A file pasted outside the message box cannot be shared because taking pasted files anywhere else on the conversation's page is not implemented.</gap> Click into the box, then paste.

<gap>A sent message's files cannot be added to or taken off because editing a message's files is not implemented.</gap> Deleting the message deletes them.

<gap>A file's link on a page left open for over an hour cannot download it because renewing the signed links of an open conversation is not implemented.</gap> Reloading the page brings new ones.

<gap>An image's preview cannot be a smaller copy of it because image variants, which need the sharp package, are not implemented here.</gap> The preview loads the image itself, drawn at most 240 pixels high.

<gap>Someone who has the conversation open still gets a notification of its new messages because telling whether it is in front of them is not implemented.</gap>

## How Protobase builds it

- **Workspaces are organizations.** `auth.organizations` in `protobase.config.ts` turns on Protobase's
  [organizations](https://docs.protobase.net/reference/auth/#organizations): people work in one at a time, are invited
  from its own **Members** and **Invitations** pages in the profile menu, and sign in with its own sign-in page. Give
  an invited person the **Participant** role, which `config/roles.ts` lets read and start channels and direct messages
  and post in them, or the **Moderator** role, which does all that and deletes anyone's messages there.
  `create: 'everyone'` lets anyone signed in start a workspace of their own.
- **Each workspace sees only its own.** Channels, direct messages and messages declare `.tenant((r) => r.organization_id)`
  ([data config](https://docs.protobase.net/reference/data-config/#resource)): every read is limited to the workspace
  the session works in, and every create is stamped with it; no request may set it.
- **Nobody posts as someone else.** `.author((r) => r.author_id)` on channels, direct messages, messages and attachments, and
  `.author((r) => r.user_id)` on reactions, stamps the signed-in person's id on every create, and refuses a request
  that names the author.
- **Only its author changes a message.** The messages' update rule is the row filter `author_id = me`
  (`config/messages/data.ts`), the superuser's too, so changing someone else's message is the `404` of a key that does
  not exist, and `channel_id`, `direct_message_id` and `thread_id` refuse updates, so a message stays where it was
  posted. A database trigger stamps `edited_at` when its body or mentions change (`db/migrations/015_reactions.sql`),
  which the chat shows as "(edited)".
- **Moderators delete, participants their own.** `.owner((r) => r.author_id)` on messages and attachments names whose a
  record is, and `config/roles.ts` gives the Participant role `messages.delete.own` and `attachments.delete.own` and the
  Moderator role `messages.delete` and `attachments.delete`
  ([scoped capabilities](https://docs.protobase.net/reference/access/#capabilities)), so a participant's delete of
  someone else's message is a `404` and a moderator's goes through, the superuser's `*` too. The conversation parents
  still check every delete, so a moderator outside a private channel is refused with a `403`. Protobase's access rules
  see a session's app role, never the workspace role (owner, admin or member), so moderating is a role of its own: a
  workspace's creator holds every app role, Moderator included, and gives it to the admins they pick on the Members
  page. A session acts with one role at a time, so the Moderator role holds a participant's capabilities too, and
  someone holding both switches to it in the profile menu. A workspace made before this version gives its owners the
  role with `bun run protobase organizations add-app-role moderator --to owners`.
- **Threads are messages too.** A reply is a message of its channel or direct message with `thread_id`, its thread's
  first message (`db/migrations/018_threads.sql`): it keeps its conversation, so the conversation parents decide who
  reads and writes it exactly as for the conversation's other messages, and a non-member's list of a private thread
  is empty. Composite foreign keys to the first message's `(id, channel_id)` and `(id, direct_message_id)` keep a reply
  in its thread's conversation, refusing another with a `409`, and a trigger refuses a reply to a reply with a `400`,
  so threads never nest. The conversation shows its flow, `isNull(thread_id)`, through an index of its messages
  outside threads, and a thread its replies through one by `thread_id`. Triggers keep the first message's
  `reply_count` and `last_reply_at`, so the change the live stream tells of that message brings its new count, and a
  message with replies is not deleted (its foreign keys answer `409`): nobody's replies go with it.
- **Reactions are records.** `reactions` (`config/reactions/data.ts`) holds one person's emoji under a message, an enum
  of six names that the chat draws from explicit labels (`components/emoji.ts`). `.parent((r) => r.message_id, 'read')`
  reads the message as the reactor would, its own conversation parents included, so only those who read a message
  react to it or see its reactions; a unique `(message_id, user_id, emoji)` refuses the same reaction twice with a
  `409`; the delete rule is `user_id = me`, and nobody updates one. Deleting a message deletes its reactions
  (`on delete cascade`), which the live stream tells of too.
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
- **Starting it again opens the one they have.** `.openExisting((r) => [r.organization_id, r.member_key])` in
  `config/direct_messages/data.ts` names that unique key, so the `409` gives its key to a caller who reads the
  conversation, and the create form opens it instead of saying it could not save. Someone outside it gets the plain
  `409`, though the starter is always in the set, so they never repeat one they are not in
  ([opening an existing record](https://docs.protobase.net/reference/data-config/#opening-an-existing-record)).
- **Files are records too.** `attachments` (`config/attachments/data.ts`) holds one file of a message in a
  [file field](https://docs.protobase.net/reference/files/), `f.file().maxSize(20_000_000)`, a text column holding the
  stored file's URI in Protobase's `private` storage, with `.derive()` writing an image's width and height, which the
  chat gives the preview so the thread does not jump as it loads. The chat uploads each file picked, pasted or dropped at once
  (`client.upload`, `components/use-attachment-uploads.ts`), checking the size first so a larger file is refused with
  its name, size and the limit, and sends the message and its files' upload tickets in one
  [batch write](https://docs.protobase.net/reference/api/#batch-writes) (`use-conversation-messages.ts`).
  `.parent((r) => r.message_id, 'read')` reads the message as the reader would, its conversation included, so only
  those who read a message list its files or get their links, which the API signs for them; a download checks the link
  and that the row still holds the file. A composite foreign key to the message's `(id, organization_id, author_id)`
  lets only its author add files (`db/migrations/017_attachments.sql`). A message of files alone has a null `body`,
  and a check at commit refuses one with neither text nor files. The foreign key refuses deleting a message that has
  files, so the chat deletes its files first in the same batch: a delete through the API also schedules each stored
  file's deletion ([deleting files](https://docs.protobase.net/reference/files/#deleting-files)). Files show under the
  message's text (`message-attachments.tsx`): an image as a preview linking to it, any other file as a link that
  downloads it.
- **Live updates.** `.live()` on channels, direct messages, messages and reactions, with the jobs schema and change capture that
  `protobase migration` wrote (`db/migrations/008_jobs.sql` and `009_changes.sql`), tells each open page which records
  changed, only of its own workspace and never their values; the chat follows the stream with `client.live` and reads
  the new messages through the API as its reader, so a private conversation's messages reach only its members ([live updates](https://docs.protobase.net/reference/live/)).
  Every `client.live` of the UI's client, `useClient()`, shares one stream, so a page holds one of the browser's few
  connections to the app for all of them; a conversation's page hands its stream to its messages, its open thread's
  replies and their reactions through `SharedLive` (`components/shared-live.tsx`), and attachments, written and deleted only with their message, are not live: the chat reads a message's
  files when the message shows (`use-message-attachments.ts`).
- **Who is online or away.** Every record has a [channel](https://docs.protobase.net/reference/channels/), which
  whoever may read the record joins with `client.channel(resource, key)`: presence and short-lived broadcasts, never
  stored. A workspace's presence is on its own record, `workspaces` (`config/workspaces/data.ts`), one per workspace,
  keyed by its organization id, whose `.tenant()` rule lets each member read only their own: so only a workspace's
  members join its channel, and someone of another is refused as for a record that does not exist. The chat adds the
  record the first time a member of a new workspace opens it (`workspace-channel.ts`), reading it first, so it needs
  no code in the sign-in. `PresenceTracker` (`presence-tracker.tsx`), drawn on every page through the shell's
  `actions` in `protobase.ui.tsx` and showing nothing, tracks the page as `online` while it shows and was clicked, typed
  or scrolled in within `idleAfterMs`, 10 minutes (`presence.ts`), and `away` once it hides or idles that long
  (`follow-activity.ts`). The channel takes 5 presence updates in 30 seconds, so it tracks the latest at most once in 7
  seconds. Each page is one entry, and a person is online when any of theirs is (`peopleActivity`); closing the page
  leaves at once, and a page whose network went away leaves within 12 seconds. The dot (`presence-dot.tsx`) is passed
  to Protobase's `StatusMark` as its `presence`, beside each name in a direct message's header
  (`direct-message-people.tsx`), and the sidebar's direct messages say it in their tooltip through the
  `directMessages` marks hook (`use-direct-message-marks.ts`), since the sidebar draws no element of the app's own.
- **Setting a status.** `status: {}` in `protobase.config.ts` turns on Protobase's
  [status](https://docs.protobase.net/reference/status/), with the table `protobase migration` wrote
  (`db/migrations/021_status.sql`): "Set a status" in the profile menu, busy, do not disturb or a text, with when it
  clears. `useMembers()` gives each member their status, read again every 15 seconds, which `StatusMark` draws beside
  the name, the text in full for one person and on hover for several, and the Members page shows too. A status is the
  server's, so it shows while the person has no page open, and it clears itself at its time.
- **Do not disturb.** The chat's notifications go through `sendNotification`, which pushes nothing to a person on do
  not disturb and still keeps the notification in their history, so the bell shows it: the chat has no code of its own
  for it.
- **Who is typing.** A conversation's typing goes over the channel of its own record, `channels/<id>` or
  `direct_messages/<id>` (`use-conversation-typing.ts`), so only those who read it hear it, a private channel's or a
  direct message's members alone. The composer follows its box's input (`use-typing-input.ts`) and broadcasts
  `typing` at most once every 3 seconds while its person writes, and once that they stopped when they empty the box or
  send (`typing.ts`); a send the channel refuses is dropped. Each page shows a typer for 6 seconds after their last,
  as "Name is typing…", "Name and Name are typing…" or "Several people are typing…" above the composer
  (`typing-line.tsx`), leaving out the reader, and a reply's typing carries its thread, so the thread panel shows its
  own. The channels of a page, its workspace's and its conversation's, share one WebSocket, so a page holds two
  connections to the app however many channels and live views it has: the live stream and the channels' socket.
- **The chat parts.** A channel's and a direct message's page are built from Protobase's
  [chat parts](https://docs.protobase.net/reference/custom-components/#chat-parts): `ChatThread`, which keeps the
  reader's place, goes to the end when they send (`followKey`) and offers earlier messages (`onLoadEarlier`);
  `ChatMessage` with the author, avatar, time and `continued` for a run of one person's messages, and its `footer`
  for "(edited)" and the reactions, drawn as `Button`s, with a bar of `Button`s over a message to react, reply in its
  thread, edit and delete, `MentionBox` to edit it with its mentions, and `Dialog` to confirm a delete; `SidePanel`
  for the open thread beside the conversation, covering the screen on a phone, with a `ChatThread` and `Composer` of
  its own; `ChatDivider` with
  `chatDayLabel` between messages that `sameChatDay` puts on different days; and `Composer`, whose `searchPeople` lists
  the members to mention and whose `onSend(text, mentionIds)` gives the ids each message keeps in `mentions`, which the
  unread counts and notifications read. The composer takes files in its own slots (`conversation-composer.tsx`): the
  📎 button in `actions`, the tray of pending files with their progress or refusal in `attachments`, `onFiles` for an
  image pasted with no text, such as a screenshot, or files dropped on it, which join the picked ones, and
  `canSendEmpty` once the files are uploaded, so Enter sends them without text. `components/` holds the pages' own code: paging and following a conversation's
  messages or a thread's replies, an edit read again and a delete taken out as the live stream tells of them
  (`use-conversation-messages.ts`),
  their reactions and files (`use-message-records.ts`), grouping them (`thread-rows.ts`) and drawing them
  (`conversation-chat.tsx`), on a channel's page (`channel-chat.tsx`) and a direct message's
  (`direct-message-chat.tsx`), exported from `protobase.ui.tsx`.
- **Names from the workspace's members.** A message stores its author and mentions as user ids;
  [`useMembers()`](https://docs.protobase.net/reference/custom-components/#members-names) gives the members of the
  workspace, by name and without their addresses, for the authors, the mentions and the people `@` lists (at most 8).
- **The chat is the conversation's page.** `.record({ component: ChannelChat })` in `config/channels/ui.ts`, and
  `DirectMessageChat` in `config/direct_messages/ui.ts`, make a conversation's record page the chat, filling the area
  beside the sidebar and under the top bar, where the page does not scroll: the messages scroll in `ChatThread` and the
  composer stays at the bottom
  ([full-area record pages](https://docs.protobase.net/reference/ui-config/#full-area-record-pages)). Its header's
  **Details** (`conversation-header.tsx`) is an `AppLink` to the conversation's standard page, its address with
  `standard: true`, read rather than a form with `.recordMode('read')`, where a channel's topic and who reads it, a
  private channel's members and a direct message's people show, and **Edit** changes the name, topic and members. `nav({ recent: { orderBy: 'name asc', limit: 20 } })` lists the
  channels under the sidebar's Channels entry
  ([recent records](https://docs.protobase.net/reference/sidebar/#recent-records)).
- **"New message" in the sidebar.** `create: { label: 'New message' }` in the `nav` of `config/direct_messages/ui.ts`
  puts a link to the create form under the sidebar's Direct messages entry, for whoever may start one
  ([create link](https://docs.protobase.net/reference/sidebar/#create-link)).
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
  positions and counts the messages of the flow, replies in threads left out, after those by others with `client.aggregate('messages', { groupBy: 'channel_id' })`,
  once for the unread and once for those whose `mentions` hold them. The counts go through the messages API's own read
  rules, so a private conversation someone is not in never counts, and it counts again whenever the live stream tells
  of a message or read position changed, so a deleted unread message drops out of the count. While it counts first, and
  after a count fails, it answers no marks (`follow-unread.ts`), so the sidebar lists the conversations unmarked: a
  marks hook that throws stops the whole sidebar. A conversation's page reads its position on opening and draws
  `ChatDivider tone="new"` above the first message after it by someone else, which `ChatThread` opens on; its
  `onReadToEnd` moves the position to the newest message once the reader is at the end while the page shows.
- **Notifications from the server.** `notifications: {}` in `protobase.config.ts` turns on Protobase's
  [notifications](https://docs.protobase.net/reference/notifications/): the bell in the top bar, each person's inbox, and
  push to the browsers they turn it on in through Web Push, with the tables `protobase migration` wrote
  (`db/migrations/014_notifications.sql`). Messages declare `.events((e) => [e.created()])`, and the subscription
  `notifyOfMessages` (`config/messages/notify.ts`, exported from `config/index.ts`) runs on the server for each
  `messages.created`, whoever wrote it, a reply in a thread too: it tells the people the message mentions and a direct
  message's other members (`told-of.ts`), never its author, of a private channel or direct message only its members, and of those only the
  workspace's members whose roles read messages, since a notification shows the message's start. It sends with
  `sendNotification(db, { userIds, inbox: true }, ...)`, a background job, a notification that names the sender, the
  channel or a direct message, whether in a thread, and the message's start, and links to the conversation's record page on `PROTOBASE_URL`
  (`notification.ts`). The demo seed turns change capture off while it writes, so its past messages notify nobody.
- **Records at their own address.** A channel is an ordinary record at `/channels/<id>` and a direct message at
  `/direct_messages/<id>`, each created with the standard form, so links and breadcrumbs work as for any record.
- **The demo seed** (`seed/`) creates its people and workspace with Protobase's host functions (`createUser`,
  `createOrganization`, `addMember`) and writes the channels, the direct message and the messages in one transaction.
  The reset (`seed/reset-demo-workspace.ts`) deletes the workspace's rows in that same transaction first, and schedules
  the deletion of its files' stored bytes, which a delete in SQL does not.
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

- Tested with Protobase **0.59.3**, and CI runs against it. The app is bundled: the `@protobase/*` packages are dev
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

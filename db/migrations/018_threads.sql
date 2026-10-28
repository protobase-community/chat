-- Threads. A reply is a message of its conversation that answers another, its thread's first message, in the same
-- conversation: it keeps its channel or direct message, so it reads as the conversation's other messages do, and its
-- thread_id keeps it out of the conversation's flow. Only a message of the flow starts a thread, so threads never nest.
-- A thread's first message keeps how many replies it has and when the last came, for the flow to show under it, and is
-- not deleted while it has replies: nobody's replies go with it.

alter table public.messages add column thread_id integer;

-- The keys of the composite foreign keys below, so a reply's thread is in the reply's own conversation.
alter table public.messages add constraint messages_id_channel unique (id, channel_id);
alter table public.messages add constraint messages_id_direct_message unique (id, direct_message_id);
alter table public.messages add foreign key (thread_id, channel_id) references public.messages (id, channel_id);
alter table public.messages add foreign key (thread_id, direct_message_id) references public.messages (id, direct_message_id);

-- The number of replies is known for every message, 0 for one nobody answered; the last reply's time is null until one.
alter table public.messages add column reply_count integer not null default 0;
alter table public.messages add column last_reply_at timestamptz;

-- A thread's replies, oldest first, as its panel reads them a page at a time, and a conversation's flow, its messages
-- outside threads, newest first.
create index messages_thread on public.messages (thread_id, id);
create index messages_channel_flow on public.messages (channel_id, thread_id, id);
create index messages_direct_message_flow on public.messages (direct_message_id, thread_id, id);

-- Refuses a reply to a reply: a thread starts at a message of a conversation's flow.
create function public.reply_to_conversation() returns trigger language plpgsql as $$
begin
  if exists (select from public.messages thread where thread.id = new.thread_id and thread.thread_id is not null) then
    raise exception 'A reply answers a message of the conversation, not another reply' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger messages_reply_to_conversation before insert on public.messages
  for each row when (new.thread_id is not null) execute function public.reply_to_conversation();

-- Keeps a thread's count of replies and the time of its last as replies come and go.
create function public.count_replies() returns trigger language plpgsql as $$
declare
  thread integer;
begin
  if tg_op = 'INSERT' then
    thread := new.thread_id;
  else
    thread := old.thread_id;
  end if;
  update public.messages
  set reply_count = (select count(*) from public.messages reply where reply.thread_id = thread),
    last_reply_at = (select max(reply.sent_at) from public.messages reply where reply.thread_id = thread)
  where id = thread;
  return null;
end
$$;

create trigger messages_count_replies after insert on public.messages
  for each row when (new.thread_id is not null) execute function public.count_replies();

create trigger messages_count_replies_deleted after delete on public.messages
  for each row when (old.thread_id is not null) execute function public.count_replies();

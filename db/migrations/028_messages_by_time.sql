-- Messages sort by when they were sent: a conversation's page reads its messages newest first, so each conversation's
-- own flow has an index in that order too.
create index messages_sent_at on public.messages (sent_at);
create index messages_channel_flow_sent_at on public.messages (channel_id, thread_id, sent_at);
create index messages_direct_message_flow_sent_at on public.messages (direct_message_id, thread_id, sent_at);

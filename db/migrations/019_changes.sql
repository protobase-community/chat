-- The change capture the resources' events and history need, written by `protobase migration`.
-- Applied with the project's other migrations; edit or remove statements the project handles differently.

drop trigger if exists "messages_changes" on "messages";

create trigger "messages_changes" after insert or delete on "messages" for each row execute function "changes"."capture"('messages', '{"id","organization_id","channel_id","direct_message_id","thread_id","author_id","body","mentions","sent_at","edited_at","reply_count","last_reply_at"}', '{}');

drop trigger if exists "messages_changes_update" on "messages";

create trigger "messages_changes_update" after update on "messages" for each row when (old.* is distinct from new.*) execute function "changes"."capture"('messages', '{"id","organization_id","channel_id","direct_message_id","thread_id","author_id","body","mentions","sent_at","edited_at","reply_count","last_reply_at"}', '{}');

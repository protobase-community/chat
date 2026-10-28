-- The change capture the resources' events and history need, written by `protobase migration`.
-- Applied with the project's other migrations; edit or remove statements the project handles differently.

drop trigger if exists "channels_changes" on "channels";

create trigger "channels_changes" after insert or delete on "channels" for each row execute function "changes"."capture"('channels', '{"id","organization_id","name","topic","kind","member_ids","author_id","created_at"}', '{}');

drop trigger if exists "channels_changes_update" on "channels";

create trigger "channels_changes_update" after update on "channels" for each row when (old.* is distinct from new.*) execute function "changes"."capture"('channels', '{"id","organization_id","name","topic","kind","member_ids","author_id","created_at"}', '{}');

drop trigger if exists "direct_messages_changes" on "direct_messages";

create trigger "direct_messages_changes" after insert or delete on "direct_messages" for each row execute function "changes"."capture"('direct_messages', '{"id","organization_id","member_ids","author_id","created_at"}', '{}');

drop trigger if exists "direct_messages_changes_update" on "direct_messages";

create trigger "direct_messages_changes_update" after update on "direct_messages" for each row when (old.* is distinct from new.*) execute function "changes"."capture"('direct_messages', '{"id","organization_id","member_ids","author_id","created_at"}', '{}');

drop trigger if exists "messages_changes" on "messages";

create trigger "messages_changes" after insert or delete on "messages" for each row execute function "changes"."capture"('messages', '{"id","organization_id","channel_id","direct_message_id","author_id","body","mentions","sent_at"}', '{}');

drop trigger if exists "messages_changes_update" on "messages";

create trigger "messages_changes_update" after update on "messages" for each row when (old.* is distinct from new.*) execute function "changes"."capture"('messages', '{"id","organization_id","channel_id","direct_message_id","author_id","body","mentions","sent_at"}', '{}');

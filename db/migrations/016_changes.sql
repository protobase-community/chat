-- The change capture the resources' events and history need, written by `protobase migration`.
-- Applied with the project's other migrations; edit or remove statements the project handles differently.

drop trigger if exists "messages_changes" on "messages";

create trigger "messages_changes" after insert or delete on "messages" for each row execute function "changes"."capture"('messages', '{"id","organization_id","channel_id","direct_message_id","author_id","body","mentions","sent_at","edited_at"}', '{}');

drop trigger if exists "messages_changes_update" on "messages";

create trigger "messages_changes_update" after update on "messages" for each row when (old.* is distinct from new.*) execute function "changes"."capture"('messages', '{"id","organization_id","channel_id","direct_message_id","author_id","body","mentions","sent_at","edited_at"}', '{}');

drop trigger if exists "reactions_changes" on "reactions";

create trigger "reactions_changes" after insert or delete on "reactions" for each row execute function "changes"."capture"('reactions', '{"id","organization_id","message_id","user_id","emoji","created_at"}', '{}');

drop trigger if exists "reactions_changes_update" on "reactions";

create trigger "reactions_changes_update" after update on "reactions" for each row when (old.* is distinct from new.*) execute function "changes"."capture"('reactions', '{"id","organization_id","message_id","user_id","emoji","created_at"}', '{}');

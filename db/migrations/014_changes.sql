-- The change capture the resources' events and history need, written by `protobase migration`.
-- Applied with the project's other migrations; edit or remove statements the project handles differently.

drop trigger if exists "direct_messages_changes" on "direct_messages";

create trigger "direct_messages_changes" after insert or delete on "direct_messages" for each row execute function "changes"."capture"('direct_messages', '{"id","organization_id","member_ids","member_key","author_id","created_at"}', '{}');

drop trigger if exists "direct_messages_changes_update" on "direct_messages";

create trigger "direct_messages_changes_update" after update on "direct_messages" for each row when (old.* is distinct from new.*) execute function "changes"."capture"('direct_messages', '{"id","organization_id","member_ids","member_key","author_id","created_at"}', '{}');

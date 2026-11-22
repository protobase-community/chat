-- The change capture the resources' events and history need, written by `protobase migration`.
-- Applied with the project's other migrations; edit or remove statements the project handles differently.

drop trigger if exists "channels_changes" on "channels";

create trigger "channels_changes" after insert or delete on "channels" for each row execute function "changes"."capture"('channels', '{"id","organization_id","name","topic","kind","member_ids","is_default","author_id","created_at"}', '{}');

drop trigger if exists "channels_changes_update" on "channels";

create trigger "channels_changes_update" after update on "channels" for each row when (old.* is distinct from new.*) execute function "changes"."capture"('channels', '{"id","organization_id","name","topic","kind","member_ids","is_default","author_id","created_at"}', '{}');

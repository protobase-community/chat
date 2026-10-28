-- The change capture the resources' events and history need, written by `protobase migration`.
-- Applied with the project's other migrations; edit or remove statements the project handles differently.

drop trigger if exists "read_positions_changes" on "read_positions";

create trigger "read_positions_changes" after insert or delete on "read_positions" for each row execute function "changes"."capture"('read_positions', '{"id","organization_id","user_id","channel_id","direct_message_id","last_read_id"}', '{}');

drop trigger if exists "read_positions_changes_update" on "read_positions";

create trigger "read_positions_changes_update" after update on "read_positions" for each row when (old.* is distinct from new.*) execute function "changes"."capture"('read_positions', '{"id","organization_id","user_id","channel_id","direct_message_id","last_read_id"}', '{}');

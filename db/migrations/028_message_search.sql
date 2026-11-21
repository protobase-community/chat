-- Message search: the words of a search are each found in a message's body by a pg_trgm index, as Protobase's search
-- matches them (ILIKE '%word%'), so the search never reads the whole table.
create extension if not exists pg_trgm;

create index messages_body_search on public.messages using gin (body gin_trgm_ops);

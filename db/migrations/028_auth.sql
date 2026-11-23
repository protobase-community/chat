-- protobase:id 93cb68ad-df25-4512-80af-74a1d8b49fa7
-- protobase:version 0.126.2
-- protobase:steps auth=5 two_factor=1 passkeys=2 sign_in_policy=1 staff_sign_in=2 organizations=2 mcp=1 personal_access_tokens=1 mail_senders=5 platform_devices=1
-- protobase:model da808f76328d79e04d0bf6e8e1c2c7787a0a6fed73e5b219c0637f2b00587eed
-- protobase:organizations ever-on
-- The auth schema changes this version of Protobase needs, written by `protobase auth migration`.
-- Applied with the project's other migrations; edit or remove statements the project handles differently.

-- mail_senders 3 sender_address_evidence: The mailbox connection of each From address and what vouches for it.
do $check$
declare
  found text;
begin
  select string_agg(ids, '; ') into found
  from (
    select string_agg(id::text, ', ' order by id) as ids from "auth"."mail_sender"
    group by "user_id", lower(btrim("address")) having count(*) > 1 limit 20
  ) as twice;
  if found is not null then
    raise exception 'The auth store has From addresses entered twice by one person, without regard to case: %. Keep one of each in a migration of the project''s own written before this one, then apply again.', found;
  end if;
end
$check$;

alter table "auth"."mail_sender" add column "connection_id" text references "auth"."account" (id) on delete set null;

alter table "auth"."mail_sender" add column "address_key" text generated always as (lower(btrim("address"))) stored;

alter table "auth"."mail_sender" add column "typed_at" timestamptz;

alter table "auth"."mail_sender" add column "listed_at" timestamptz;

alter table "auth"."mail_sender" add column "provider_state" text;

alter table "auth"."mail_sender" add column "provider_state_read_at" timestamptz;

alter table "auth"."mail_sender" add column "removed_at" timestamptz;

update "auth"."mail_sender" set "typed_at" = "created_at";

update "auth"."mail_sender" set "connection_id" = only_one.id
from (
  select "user_id" as user_id, (array_agg(id))[1] as id from "auth"."account"
  where "provider_id" = 'google' and 'https://www.googleapis.com/auth/gmail.send' = any(regexp_split_to_array(coalesce("scope", ''), '[\s,]+'))
  group by "user_id" having count(*) = 1
) as only_one
where "auth"."mail_sender"."user_id" = only_one.user_id;

create unique index "mail_sender_connection_address_uidx" on "auth"."mail_sender" ("connection_id", "address_key");

create index "mail_sender_user_address_idx" on "auth"."mail_sender" ("user_id", "address_key");

do $drop$
declare
  found text;
begin
  select con.conname into found from pg_constraint con
  where con.conrelid = '"auth"."mail_sender"'::regclass and con.contype = 'u'
    and (select array_agg('"' || att.attname || '"' order by att.attname) from pg_attribute att where att.attrelid = con.conrelid and att.attnum = any(con.conkey))
      = (select array_agg(name order by name) from unnest(array['"user_id"', '"address"']) as name);
  if found is not null then
    execute format('alter table %s drop constraint %I', '"auth"."mail_sender"'::regclass, found);
  end if;
end
$drop$;

insert into "auth"."auth_migrations" ("version", "name") values (15, 'sender_address_evidence');

-- mail_senders 4 sender_verifications: The verifications the app's verifiers run on From addresses.
create table "auth"."mail_sender_verification" (
  id text primary key,
  "sender_id" text not null references "auth"."mail_sender" (id) on delete cascade,
  "verifier" text not null,
  "state" text not null check ("state" in ('pending', 'verified', 'failed')),
  "secret_hash" text not null,
  "created_at" timestamptz not null,
  "expires_at" timestamptz not null,
  "next_check_at" timestamptz not null,
  "settled_at" timestamptz,
  "valid_until" timestamptz,
  "error_code" text,
  "error" text check (char_length("error") <= 500)
);

create unique index "mail_sender_verification_pending_uidx" on "auth"."mail_sender_verification" ("sender_id", "verifier") where "state" = 'pending';

create unique index "mail_sender_verification_secret_uidx" on "auth"."mail_sender_verification" ("secret_hash");

create index "mail_sender_verification_due_idx" on "auth"."mail_sender_verification" ("next_check_at") where "state" = 'pending';

create index "mail_sender_verification_expiry_idx" on "auth"."mail_sender_verification" ("expires_at") where "state" = 'pending';

create index "mail_sender_verification_sender_idx" on "auth"."mail_sender_verification" ("sender_id", "verifier", "created_at");

insert into "auth"."auth_migrations" ("version", "name") values (16, 'sender_verifications');

-- mail_senders 5 sender_sharing: When the owner of each From address shared it with the app's other senders.
alter table "auth"."mail_sender" add column "shared_at" timestamptz;

alter table "auth"."mail_sender" alter column "shared" drop not null;

create index "mail_sender_shared_at_idx" on "auth"."mail_sender" ("user_id") where "shared_at" is not null;

insert into "auth"."auth_migrations" ("version", "name") values (17, 'sender_sharing');

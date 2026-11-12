-- The auth schema changes this version of Protobase needs, written by `protobase auth migration`.
-- Applied with the project's other migrations; edit or remove statements the project handles differently.

-- 8 personal_access_tokens: The personal access tokens people make for their scripts, by their tokens' hashes.
create table "auth"."personal_access_token" (
  id text primary key,
  user_id text not null references "auth"."user" (id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  role text not null,
  organization_id text references "auth"."organization" (id) on delete cascade,
  created_at timestamptz not null,
  expires_at timestamptz,
  last_used_at timestamptz
);

create index personal_access_token_user_id_idx on "auth"."personal_access_token" (user_id);

insert into "auth"."auth_migrations" (version, name) values (8, 'personal_access_tokens');

-- 9 mail_senders: The From addresses people send mail from through the mailbox they linked.
create table "auth"."mail_sender" (
  id text primary key,
  user_id text not null references "auth"."user" (id) on delete cascade,
  address text not null,
  shared boolean not null,
  signature text,
  is_default boolean not null,
  created_at timestamptz not null,
  unique (user_id, address)
);

create unique index mail_sender_default_idx on "auth"."mail_sender" (user_id) where is_default;

create index mail_sender_shared_idx on "auth"."mail_sender" (address) where shared;

insert into "auth"."auth_migrations" (version, name) values (9, 'mail_senders');

-- 10 mail_sender_names: The display names of the From addresses people send mail from.
alter table "auth"."mail_sender" add column name text;

insert into "auth"."auth_migrations" (version, name) values (10, 'mail_sender_names');

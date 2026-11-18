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

-- 11 account_keys: One account per provider and account id, and per person where a provider links one, the device accounts people signed out of, and the sessions of each device.
create unique index account_provider_id_account_id_uidx on "auth"."account" (provider_id, account_id);

alter table "auth"."account" add column single_subject_user_id text;

create unique index account_provider_id_single_subject_user_id_uidx on "auth"."account" (provider_id, single_subject_user_id);

create table "auth"."refused_account" (
  id text primary key,
  provider_id text not null,
  account_id text not null,
  user_id text not null references "auth"."user" (id) on delete cascade,
  created_at timestamptz not null,
  unique (provider_id, account_id)
);

create index refused_account_user_id_idx on "auth"."refused_account" (user_id);

create table "auth"."device_session" (
  id text primary key,
  session_id text not null unique references "auth"."session" (id) on delete cascade,
  account_id text not null,
  created_at timestamptz not null
);

create index device_session_account_id_idx on "auth"."device_session" (account_id);

insert into "auth"."auth_migrations" (version, name) values (11, 'account_keys');

-- 12 user_indexes: The indexes that find the active admins and page through the users.
create index if not exists user_active_admin_idx on "auth"."user" (id) where "banned" is not true and 'admin' = any(regexp_split_to_array(regexp_replace(regexp_replace(coalesce("role", 'user'), '^\s*\{(.*)\}\s*$', '\1'), '^\s*"?|"?\s*$', '', 'g'), '"?\s*,\s*"?'));

create index if not exists user_created_at_id_idx on "auth"."user" ("created_at", id);

insert into "auth"."auth_migrations" (version, name) values (12, 'user_indexes');

-- 13 lookup_indexes: The indexes that page through the organizations and find passkeys, staff sign-ins and app invitations.
create index organization_created_at_id_idx on "auth"."organization" (created_at, id);

create index passkey_rp_id_idx on "auth"."passkey" (rp_id);

create index staff_sign_in_session_id_idx on "auth"."staff_sign_in" (session_id);

create index staff_sign_in_started_at_idx on "auth"."staff_sign_in" (started_at desc);

create index verification_identifier_pattern_idx on "auth"."verification" (identifier text_pattern_ops);

insert into "auth"."auth_migrations" (version, name) values (13, 'lookup_indexes');

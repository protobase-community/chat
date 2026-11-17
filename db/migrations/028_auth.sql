-- The auth schema changes this version of Protobase needs, written by `protobase auth migration`.
-- Applied with the project's other migrations; edit or remove statements the project handles differently.

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

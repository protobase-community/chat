-- protobase:id 6b99e1f0-4372-40fc-8a25-53d15087acb4
-- protobase:version 0.126.2
-- protobase:steps auth=5 two_factor=1 passkeys=2 sign_in_policy=1 staff_sign_in=2 organizations=2 mcp=1 personal_access_tokens=1 mail_senders=5 platform_devices=1
-- protobase:model da808f76328d79e04d0bf6e8e1c2c7787a0a6fed73e5b219c0637f2b00587eed
-- protobase:organizations ever-on
-- The auth schema changes this version of Protobase needs, written by `protobase auth migration`.
-- Applied with the project's other migrations; edit or remove statements the project handles differently.

-- mail_senders 5 sender_sharing: When the owner of each From address shared it with the app's other senders.
alter table "auth"."mail_sender" add column "shared_at" timestamptz;

alter table "auth"."mail_sender" alter column "shared" drop not null;

create index "mail_sender_shared_at_idx" on "auth"."mail_sender" ("user_id") where "shared_at" is not null;

insert into "auth"."auth_migrations" ("version", "name") values (17, 'sender_sharing');

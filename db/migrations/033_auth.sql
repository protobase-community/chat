-- protobase:id 9ce6ba60-9444-44bf-a3d0-e353bc1ca21b
-- protobase:version 0.125.0
-- protobase:steps auth=5 two_factor=1 passkeys=2 sign_in_policy=1 staff_sign_in=2 organizations=2 mcp=1 personal_access_tokens=1 mail_senders=4 platform_devices=1
-- protobase:model 4ed80b5ff50789cd8f16b40f2b0dc8a9dcad7a8b0c3c0f8d0359d47e62e1502b
-- protobase:organizations ever-on
-- The auth schema changes this version of Protobase needs, written by `protobase auth migration`.
-- Applied with the project's other migrations; edit or remove statements the project handles differently.

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

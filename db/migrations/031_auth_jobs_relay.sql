-- protobase:id d96967fc-c7d6-42f2-8a4a-c0bf99fb7c5f
-- protobase:version 0.132.2
-- protobase:steps auth=6 two_factor=1 passkeys=2 sign_in_policy=1 staff_sign_in=2 organizations=3
-- protobase:modules {"jobs":{"lastStep":1,"replaceables":{"functions":5}},"changes":{"lastStep":1,"replaceables":{"capture":1},"names":{"schema":"changes"},"resources":{"triggers":{"channels":{"version":1,"digest":"ad9f88c46762c892","table":{"name":"channels"}},"direct_messages":{"version":1,"digest":"b009945a2478ebf3","table":{"name":"direct_messages"}},"messages":{"version":1,"digest":"55a794ea14081d99","table":{"name":"messages"}},"read_positions":{"version":1,"digest":"64299bd2bb8726c1","table":{"name":"read_positions"}},"reactions":{"version":1,"digest":"9feccf95ed0107af","table":{"name":"reactions"}}}}},"notices":{"lastStep":1,"replaceables":{},"names":{"schema":"changes"}},"notification_devices":{"lastStep":1,"replaceables":{},"names":{"schema":"notifications","table":"devices","users":"\"auth\".\"user\"","user_id_type":"text","column.id":"id","column.user_id":"user_id","column.kind":"kind","column.token":"token","column.p256dh":"p256dh","column.auth":"auth","column.environment":"environment","column.app_id":"app_id","column.user_agent":"user_agent","column.session_id":"session_id","column.created_at":"created_at","column.last_seen_at":"last_seen_at"}},"notification_history":{"lastStep":1,"replaceables":{},"names":{"schema":"notifications","table":"history","users":"\"auth\".\"user\"","user_id_type":"text","column.id":"id","column.user_id":"user_id","column.title":"title","column.body":"body","column.url":"url","column.data":"data","column.created_at":"created_at","column.read_at":"read_at"}},"status":{"lastStep":1,"replaceables":{},"names":{"schema":"status","table":"statuses","users":"\"auth\".\"user\"","user_id_type":"text"}},"calls":{"lastStep":2,"replaceables":{}},"relay":{"lastStep":1,"replaceables":{"sessions":1,"members":3},"names":{"sessions":"\"auth\".\"session\""},"resources":{"members":{"direct_messages":{"version":1,"digest":"ecf99936e4823afe","table":{"name":"direct_messages"}}}}}}
-- protobase:model 8d871a5c1b47ab26ce97772968511e681751181c5a3e9effe1195040036c8382
-- protobase:organizations ever-on
-- protobase:breaks-older-code
-- Written by `protobase migration` from the config and protobase.snapshot.json; applied with the project's other migrations.

-- It breaks older code: once it is applied, the version before refuses to start on the database, and rolling back to it is blocked.
-- The jobs schema this version of Protobase needs: it replaces its functions at version 3 with version 5, which the code before does not run on.

-- The auth schema changes this version of Protobase needs.
-- auth 6 drop_version_record: The drop of the former record of versions, which auth_steps replaced.
do $step$ begin
if not exists (select from "auth"."auth_steps" where "module" = 'auth' and "step" = 6 and "target" = 'auth') then
execute $statement$drop table if exists "auth"."auth_migrations"$statement$;
execute $statement$insert into "auth"."auth_steps" ("module", "step", "target", "applied_at") values ('auth', 6, 'auth', now())$statement$;
end if;
end $step$;

-- The jobs schema this version of Protobase needs.
-- Protobase's functions of the jobs schema.
create or replace function jobs.enqueue(
  job_name text,
  payload jsonb,
  run_at timestamptz,
  key text,
  group_key text,
  priority integer,
  organization jsonb
) returns uuid
language plpgsql as $$
declare
  queue jobs.queue;
  data jsonb := payload;
  start timestamptz := coalesce(run_at, jobs.job_now());
  job_id uuid;
begin
  if key is not null and group_key is not null then
    raise exception 'Job "%": an ordered job takes a group_key and no key', job_name;
  end if;
  if organization = 'null'::jsonb then
    organization := null;
  end if;
  if organization is not null and jsonb_typeof(organization) not in ('string', 'number') then
    raise exception 'Job "%": an organization is a string or a number', job_name;
  end if;
  if organization is not null or (jsonb_typeof(payload) = 'object' and payload ? '~organization') then
    data := jsonb_build_object('~organization', coalesce(organization, 'null'::jsonb), 'payload', coalesce(payload, 'null'::jsonb));
  end if;
  perform jobs.create_queue(job_name, jsonb_build_object('policy', case when group_key is null then 'standard' else 'key_strict_fifo' end));
  select * into queue from jobs.queue where name = job_name;
  if (queue.policy = 'key_strict_fifo') <> (group_key is not null) then
    raise exception 'Job "%" %', job_name, case when group_key is null then 'is ordered: pass its group_key' else 'is not ordered: it takes no group_key' end;
  end if;
  if key is not null then
    select id into job_id from jobs.job
    where name = job_name and singleton_key = key and state < 'active'
    order by created_on desc limit 1;
    if found then
      return job_id;
    end if;
  end if;
  execute format(
    'insert into jobs.%I (name, data, priority, start_after, singleton_key, retry_limit, retry_delay, retry_backoff,
       retry_delay_max, expire_seconds, deletion_seconds, keep_until, policy, dead_letter, heartbeat_seconds, upsert_by_key, id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $4 + $12 * interval ''1s'', $13, $14, $15, $16, $17)
     on conflict do nothing
     returning id',
    queue.table_name)
  using job_name, data, priority, start, coalesce(key, group_key), queue.retry_limit, queue.retry_delay,
    queue.retry_backoff, queue.retry_delay_max, queue.expire_seconds, queue.deletion_seconds, queue.retention_seconds,
    queue.policy, queue.dead_letter, queue.heartbeat_seconds, key is not null,
    case when group_key is null then gen_random_uuid() else uuidv7() end
  into job_id;
  -- A concurrent enqueue of the same key inserted first: its job is the one waiting.
  if job_id is null and key is not null then
    select id into job_id from jobs.job
    where name = job_name and singleton_key = key and state < 'active'
    order by created_on desc limit 1;
  end if;
  return job_id;
end
$$;
comment on function jobs.enqueue(text, jsonb, timestamptz, text, text, integer, jsonb) is 'Protobase jobs 5';
create or replace function jobs.enqueue(
  job_name text,
  payload jsonb default null,
  run_at timestamptz default null,
  key text default null,
  group_key text default null,
  priority integer default 0
) returns uuid
language sql as $$
  select jobs.enqueue(job_name, payload, run_at, key, group_key, priority, null)
$$;
comment on function jobs.enqueue(text, jsonb, timestamptz, text, text, integer) is 'Protobase jobs 5';

create or replace function jobs.next_due() returns timestamptz
language sql stable as $$
  select min(due) from (
    select j.start_after as due from jobs.job j
    where j.state < 'active' and not j.blocked
      and not (j.policy = 'key_strict_fifo' and exists (
        select 1 from jobs.job h where h.name = j.name and h.singleton_key = j.singleton_key and h.state = 'failed'))
    union all
    select started_on + expire_seconds * interval '1s' from jobs.job where state = 'active'
  ) jobs
$$;
comment on function jobs.next_due() is 'Protobase jobs 5';

create index if not exists job_failed_i on jobs.job (completed_on) where state = 'failed';
drop view if exists jobs.failed;
create view jobs.failed as
select id, name,
  case when jsonb_typeof(data) = 'object' and data ? '~organization' then data -> 'payload' else data end as payload, retry_count + 1 as attempts,
  coalesce(output ->> 'message', output -> 'value' ->> 'message', output ->> 'value') as error,
  output, completed_on as failed_at, created_on as created_at, singleton_key as key, false as retry
from jobs.job where state = 'failed';
create or replace function jobs.failed_retry() returns trigger
language plpgsql as $$
begin
  if new.retry then
    update jobs.job
    set state = 'retry', retry_limit = retry_limit + 1, completed_on = null,
      start_after = greatest(start_after, jobs.job_now()), keep_until = greatest(keep_until, jobs.job_now() + interval '14 days')
    where name = old.name and id = old.id and state = 'failed';
  end if;
  return new;
end
$$;
comment on function jobs.failed_retry() is 'Protobase jobs 5';
create or replace function jobs.failed_delete() returns trigger
language plpgsql as $$
begin
  delete from jobs.job where name = old.name and id = old.id and state = 'failed';
  return old;
end
$$;
comment on function jobs.failed_delete() is 'Protobase jobs 5';
create trigger failed_retry instead of update on jobs.failed for each row execute function jobs.failed_retry();
create trigger failed_delete instead of delete on jobs.failed for each row execute function jobs.failed_delete();

-- The trigger that closes a deleted sign-in session's sockets on the realtime relay, and realtime.members with the triggers that keep it from the channel records that list their members.
-- The realtime.members table.
create schema if not exists realtime;

create table if not exists realtime.members (
  resource text not null,
  channel_key text not null,
  user_id text not null,
  primary key (resource, channel_key, user_id)
);

create index if not exists members_by_user on realtime.members (user_id, resource);

-- The trigger that closes a deleted session's sockets.
create schema if not exists relay;

create or replace function relay.session_ended() returns trigger
language plpgsql as $$
declare
  ids jsonb;
begin
  select jsonb_agg(id::text) into ids from ended;
  if ids is not null then
    perform jobs.enqueue('relay.close-sessions', jsonb_build_object('sessions', ids));
  end if;
  return null;
end
$$;

comment on function relay.session_ended() is 'Protobase relay sessions 1';

drop trigger if exists relay_session_ended on "auth"."session";

create trigger relay_session_ended after delete on "auth"."session" referencing old table as ended for each statement execute function relay.session_ended();

-- The functions that keep realtime.members.
create or replace function realtime.listed_members(entry jsonb, members_column text, deleted_column text) returns setof text
language sql immutable as $$
  select distinct member from jsonb_array_elements_text(
    case when (deleted_column = '' or entry ->> deleted_column is null) and jsonb_typeof(entry -> members_column) = 'array' then entry -> members_column else '[]'::jsonb end
  ) as member where member is not null
$$;

create or replace function realtime.members_kept() returns trigger
language plpgsql as $$
declare
  channel_resource text := tg_argv[0];
  key_column text := tg_argv[1];
  members_column text := tg_argv[2];
  deleted_column text := tg_argv[3];
  old_entry jsonb;
  new_entry jsonb;
  keys text[];
  key_type text;
  -- The table the trigger stands on: the partitioned one for a partition's clone or truncate trigger.
  source regclass := coalesce(pg_partition_root(tg_relid), tg_relid);
begin
  if tg_op = 'TRUNCATE' then
    delete from realtime.members m where m.resource = channel_resource;
    execute format('insert into realtime.members (resource, channel_key, user_id)
      select $1, to_jsonb(t) ->> $2, member from %s t cross join lateral realtime.listed_members(to_jsonb(t), $3, $4) as member
      on conflict do nothing', source)
      using channel_resource, key_column, members_column, deleted_column;
    return null;
  end if;
  if tg_op <> 'INSERT' then old_entry := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_entry := to_jsonb(new); end if;
  if tg_op = 'UPDATE' and old_entry -> key_column is not distinct from new_entry -> key_column
    and old_entry -> members_column is not distinct from new_entry -> members_column
    and (deleted_column = '' or old_entry -> deleted_column is not distinct from new_entry -> deleted_column) then
    return null;
  end if;
  keys := array(select distinct k from unnest(array[old_entry ->> key_column, new_entry ->> key_column]) as k where k is not null);
  delete from realtime.members m where m.resource = channel_resource and m.channel_key = any(keys);
  select format_type(a.atttypid, a.atttypmod) into key_type from pg_attribute a where a.attrelid = source and a.attname = key_column;
  execute format('insert into realtime.members (resource, channel_key, user_id)
    select $1, to_jsonb(t) ->> $2, member from %s t cross join lateral realtime.listed_members(to_jsonb(t), $3, $4) as member
    where t.%I = any($5::%s[]) on conflict do nothing', source, key_column, key_type)
    using channel_resource, key_column, members_column, deleted_column, keys;
  return null;
end
$$;

comment on function realtime.members_kept() is 'Protobase realtime members 3';

-- The triggers that keep realtime.members of direct_messages.
do $members$ begin
  if exists (select from pg_class c where c.oid = '"direct_messages"'::regclass and (c.relispartition or (c.relkind <> 'p' and exists (select from pg_inherits i where i.inhrelid = c.oid or i.inhparent = c.oid)))) then
    raise exception 'realtime.members cannot keep the members of %: a partition or a table in an inheritance tree is not supported as a channel resource whose records list their members; use the partitioned table itself', '"direct_messages"';
  end if;
end $members$;

drop trigger if exists realtime_members on "direct_messages";

drop trigger if exists realtime_members_truncated on "direct_messages";

create trigger realtime_members after insert or delete or update on "direct_messages" for each row execute function realtime.members_kept('direct_messages', 'id', 'member_ids', '');

create trigger realtime_members_truncated after truncate on "direct_messages" for each statement execute function realtime.members_kept('direct_messages', 'id', 'member_ids', '');

do $members$ declare part regclass; begin
  for part in select relid from pg_partition_tree(to_regclass('"direct_messages"')) where relid <> to_regclass('"direct_messages"') loop
    execute format('drop trigger if exists realtime_members_truncated on %s', part);
    execute format('create trigger realtime_members_truncated after truncate on %s for each statement execute function realtime.members_kept(%s)', part, '''direct_messages'', ''id'', ''member_ids'', ''''');
  end loop;
end $members$;

delete from realtime.members where resource = 'direct_messages';

insert into realtime.members (resource, channel_key, user_id)
  select 'direct_messages', to_jsonb(t) ->> 'id', member from "direct_messages" t
  cross join lateral realtime.listed_members(to_jsonb(t), 'member_ids', '') as member
  on conflict do nothing;

-- protobase:record d96967fc-c7d6-42f2-8a4a-c0bf99fb7c5f
-- The row that records this migration as applied, which the server reads at startup.
create schema if not exists migrations;
create table if not exists migrations.history (
  id text primary key,
  number integer,
  name text not null,
  protobase_version text not null,
  model jsonb not null,
  model_hash text not null,
  physical jsonb not null,
  additive boolean,
  sql_hash text,
  applied_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz
);
create index if not exists history_applied_at on migrations.history (applied_at);
insert into migrations.history (id, number, name, protobase_version, model, model_hash, physical, additive, sql_hash, completed_at) values ('d96967fc-c7d6-42f2-8a4a-c0bf99fb7c5f', 31, '031_auth_jobs_relay', '0.132.2', '{"auth":{"schema":"auth","ids":"text","userKeyTable":null,"userMetadata":null,"scopedTablesCarryOrganization":true,"modules":{"auth":{"lastStep":6,"tables":{"user":{"name":"user","scope":"global","columns":{"name":"name","email":"email","email_verified":"email_verified","image":"image","created_at":"created_at","updated_at":"updated_at","role":"role","banned":"banned","ban_reason":"ban_reason","ban_expires":"ban_expires","last_role":"last_role","email_confirmed_at":"email_confirmed_at","two_factor_enabled":"two_factor_enabled","last_organization_id":"last_organization_id"},"indexes":{"user_active_admin_idx":"user_active_admin_idx","user_created_at_id_idx":"user_created_at_id_idx","user_name_id_idx":"user_name_id_idx","user_name_trgm_idx":"user_name_trgm_idx"}},"session":{"name":"session","scope":"global","columns":{"expires_at":"expires_at","token":"token","created_at":"created_at","updated_at":"updated_at","ip_address":"ip_address","user_agent":"user_agent","user_id":"user_id","impersonated_by":"impersonated_by","active_role":"active_role","active_organization_id":"active_organization_id"},"indexes":{"session_user_id_idx":"session_user_id_idx"}},"account":{"name":"account","scope":"global","columns":{"account_id":"account_id","provider_id":"provider_id","user_id":"user_id","access_token":"access_token","refresh_token":"refresh_token","id_token":"id_token","access_token_expires_at":"access_token_expires_at","refresh_token_expires_at":"refresh_token_expires_at","scope":"scope","password":"password","created_at":"created_at","updated_at":"updated_at","single_subject_user_id":"single_subject_user_id"},"indexes":{"account_user_id_idx":"account_user_id_idx","account_provider_id_account_id_uidx":"account_provider_id_account_id_uidx","account_provider_id_single_subject_user_id_uidx":"account_provider_id_single_subject_user_id_uidx"}},"verification":{"name":"verification","scope":"global","columns":{"identifier":"identifier","value":"value","expires_at":"expires_at","created_at":"created_at","updated_at":"updated_at"},"indexes":{"verification_identifier_idx":"verification_identifier_idx","verification_identifier_pattern_idx":"verification_identifier_pattern_idx"}},"jwks":{"name":"jwks","scope":"global","columns":{"public_key":"public_key","private_key":"private_key","created_at":"created_at","expires_at":"expires_at","alg":"alg","crv":"crv"},"indexes":{}},"auth_steps":{"name":"auth_steps","scope":"global","columns":{"module":"module","step":"step","target":"target","applied_at":"applied_at"},"indexes":{}}}},"two_factor":{"lastStep":1,"tables":{"two_factor":{"name":"two_factor","scope":"global","columns":{"secret":"secret","backup_codes":"backup_codes","user_id":"user_id","verified":"verified","failed_verification_count":"failed_verification_count","locked_until":"locked_until"},"indexes":{"two_factor_secret_idx":"two_factor_secret_idx","two_factor_user_id_idx":"two_factor_user_id_idx"}}}},"passkeys":{"lastStep":2,"tables":{"passkey":{"name":"passkey","scope":"global","columns":{"name":"name","public_key":"public_key","user_id":"user_id","credential_id":"credential_id","counter":"counter","device_type":"device_type","backed_up":"backed_up","transports":"transports","created_at":"created_at","aaguid":"aaguid","rp_id":"rp_id"},"indexes":{"passkey_user_id_idx":"passkey_user_id_idx","passkey_credential_id_idx":"passkey_credential_id_idx","passkey_rp_id_idx":"passkey_rp_id_idx"}}}},"sign_in_policy":{"lastStep":1,"tables":{"sign_in_policy":{"name":"sign_in_policy","scope":"global","columns":{"password":"password","email_code":"email_code","passkey":"passkey","two_factor":"two_factor","staff_access":"staff_access","platform_sign_in":"platform_sign_in","created_at":"created_at","created_by":"created_by"},"indexes":{}}}},"staff_sign_in":{"lastStep":2,"tables":{"staff_sign_in":{"name":"staff_sign_in","scope":"global","columns":{"user_id":"user_id","user_email":"user_email","staff":"staff","staff_name":"staff_name","staff_subject":"staff_subject","issuer":"issuer","reason":"reason","session_id":"session_id","started_at":"started_at","expires_at":"expires_at","ended_at":"ended_at"},"indexes":{"staff_sign_in_session_id_idx":"staff_sign_in_session_id_idx","staff_sign_in_started_at_idx":"staff_sign_in_started_at_idx"}}}},"organizations":{"lastStep":3,"tables":{"organization":{"name":"organization","scope":"global","columns":{"name":"name","slug":"slug","logo":"logo","created_at":"created_at","metadata":"metadata"},"indexes":{"organization_created_at_id_idx":"organization_created_at_id_idx"}},"member":{"name":"member","scope":"organization","columns":{"organization_id":"organization_id","user_id":"user_id","role":"role","created_at":"created_at","app_roles":"app_roles"},"indexes":{"member_organization_id_idx":"member_organization_id_idx","member_user_id_idx":"member_user_id_idx"}},"invitation":{"name":"invitation","scope":"organization","columns":{"organization_id":"organization_id","email":"email","role":"role","status":"status","expires_at":"expires_at","created_at":"created_at","inviter_id":"inviter_id","app_roles":"app_roles"},"indexes":{"invitation_organization_id_idx":"invitation_organization_id_idx","invitation_email_idx":"invitation_email_idx"}}}}}},"modules":{"jobs":{"lastStep":1,"replaceables":{"functions":5}},"changes":{"lastStep":1,"replaceables":{"capture":1},"names":{"schema":"changes"},"resources":{"triggers":{"channels":{"version":1,"digest":"ad9f88c46762c892","table":{"name":"channels"}},"direct_messages":{"version":1,"digest":"b009945a2478ebf3","table":{"name":"direct_messages"}},"messages":{"version":1,"digest":"55a794ea14081d99","table":{"name":"messages"}},"read_positions":{"version":1,"digest":"64299bd2bb8726c1","table":{"name":"read_positions"}},"reactions":{"version":1,"digest":"9feccf95ed0107af","table":{"name":"reactions"}}}}},"notices":{"lastStep":1,"replaceables":{},"names":{"schema":"changes"}},"notification_devices":{"lastStep":1,"replaceables":{},"names":{"schema":"notifications","table":"devices","users":"\"auth\".\"user\"","user_id_type":"text","column.id":"id","column.user_id":"user_id","column.kind":"kind","column.token":"token","column.p256dh":"p256dh","column.auth":"auth","column.environment":"environment","column.app_id":"app_id","column.user_agent":"user_agent","column.session_id":"session_id","column.created_at":"created_at","column.last_seen_at":"last_seen_at"}},"notification_history":{"lastStep":1,"replaceables":{},"names":{"schema":"notifications","table":"history","users":"\"auth\".\"user\"","user_id_type":"text","column.id":"id","column.user_id":"user_id","column.title":"title","column.body":"body","column.url":"url","column.data":"data","column.created_at":"created_at","column.read_at":"read_at"}},"status":{"lastStep":1,"replaceables":{},"names":{"schema":"status","table":"statuses","users":"\"auth\".\"user\"","user_id_type":"text"}},"calls":{"lastStep":2,"replaceables":{}},"relay":{"lastStep":1,"replaceables":{"sessions":1,"members":3},"names":{"sessions":"\"auth\".\"session\""},"resources":{"members":{"direct_messages":{"version":1,"digest":"ecf99936e4823afe","table":{"name":"direct_messages"}}}}}}}'::jsonb, '8d871a5c1b47ab26ce97772968511e681751181c5a3e9effe1195040036c8382', '{"auth":["auth","auth.account","auth.account.access_token","auth.account.access_token_expires_at","auth.account.account_id","auth.account.created_at","auth.account.id","auth.account.id_token","auth.account.password","auth.account.provider_id","auth.account.refresh_token","auth.account.refresh_token_expires_at","auth.account.scope","auth.account.single_subject_user_id","auth.account.updated_at","auth.account.user_id","auth.account_provider_id_account_id_uidx","auth.account_provider_id_single_subject_user_id_uidx","auth.account_user_id_idx","auth.auth_steps","auth.auth_steps.applied_at","auth.auth_steps.id","auth.auth_steps.module","auth.auth_steps.step","auth.auth_steps.target","auth.invitation","auth.invitation.app_roles","auth.invitation.created_at","auth.invitation.email","auth.invitation.expires_at","auth.invitation.id","auth.invitation.inviter_id","auth.invitation.organization_id","auth.invitation.role","auth.invitation.status","auth.invitation_email_idx","auth.invitation_organization_id_idx","auth.jwks","auth.jwks.alg","auth.jwks.created_at","auth.jwks.crv","auth.jwks.expires_at","auth.jwks.id","auth.jwks.private_key","auth.jwks.public_key","auth.member","auth.member.app_roles","auth.member.created_at","auth.member.id","auth.member.organization_id","auth.member.role","auth.member.user_id","auth.member_organization_id_idx","auth.member_user_id_idx","auth.organization","auth.organization.created_at","auth.organization.id","auth.organization.logo","auth.organization.metadata","auth.organization.name","auth.organization.slug","auth.organization_created_at_id_idx","auth.passkey","auth.passkey.aaguid","auth.passkey.backed_up","auth.passkey.counter","auth.passkey.created_at","auth.passkey.credential_id","auth.passkey.device_type","auth.passkey.id","auth.passkey.name","auth.passkey.public_key","auth.passkey.rp_id","auth.passkey.transports","auth.passkey.user_id","auth.passkey_credential_id_idx","auth.passkey_rp_id_idx","auth.passkey_user_id_idx","auth.session","auth.session.active_organization_id","auth.session.active_role","auth.session.created_at","auth.session.expires_at","auth.session.id","auth.session.impersonated_by","auth.session.ip_address","auth.session.token","auth.session.updated_at","auth.session.user_agent","auth.session.user_id","auth.session_user_id_idx","auth.sign_in_policy","auth.sign_in_policy.created_at","auth.sign_in_policy.created_by","auth.sign_in_policy.email_code","auth.sign_in_policy.id","auth.sign_in_policy.passkey","auth.sign_in_policy.password","auth.sign_in_policy.platform_sign_in","auth.sign_in_policy.staff_access","auth.sign_in_policy.two_factor","auth.staff_sign_in","auth.staff_sign_in.ended_at","auth.staff_sign_in.expires_at","auth.staff_sign_in.id","auth.staff_sign_in.issuer","auth.staff_sign_in.reason","auth.staff_sign_in.session_id","auth.staff_sign_in.staff","auth.staff_sign_in.staff_name","auth.staff_sign_in.staff_subject","auth.staff_sign_in.started_at","auth.staff_sign_in.user_email","auth.staff_sign_in.user_id","auth.staff_sign_in_session_id_idx","auth.staff_sign_in_started_at_idx","auth.two_factor","auth.two_factor.backup_codes","auth.two_factor.failed_verification_count","auth.two_factor.id","auth.two_factor.locked_until","auth.two_factor.secret","auth.two_factor.user_id","auth.two_factor.verified","auth.two_factor_secret_idx","auth.two_factor_user_id_idx","auth.user","auth.user.ban_expires","auth.user.ban_reason","auth.user.banned","auth.user.created_at","auth.user.email","auth.user.email_confirmed_at","auth.user.email_verified","auth.user.id","auth.user.image","auth.user.last_organization_id","auth.user.last_role","auth.user.name","auth.user.role","auth.user.two_factor_enabled","auth.user.updated_at","auth.user_active_admin_idx","auth.user_created_at_id_idx","auth.user_name_id_idx","auth.user_name_trgm_idx","auth.verification","auth.verification.created_at","auth.verification.expires_at","auth.verification.id","auth.verification.identifier","auth.verification.updated_at","auth.verification.value","auth.verification_identifier_idx","auth.verification_identifier_pattern_idx"]}'::jsonb, false, 'fb672ac49be6d78c8da2f6d6e63674352f3144070745f1634b0320080d6632b9', clock_timestamp());

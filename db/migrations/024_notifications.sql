-- The tables of notifications, written by `protobase migration`.
-- Applied with the project's other migrations; edit or remove statements the project handles differently.

alter table "notifications"."devices" drop constraint "devices_check", drop constraint "devices_kind_check", add check ("kind" in ('web', 'apns', 'fcm', 'relay')), add check (
    ("kind" = 'web' and "p256dh" is not null and "auth" is not null and "environment" is null and "app_id" is null)
    or ("kind" = 'apns' and "p256dh" is null and "auth" is null and "environment" is not null and "app_id" is not null)
    or ("kind" = 'fcm' and "p256dh" is null and "auth" is null and "environment" is null)
    or ("kind" = 'relay' and "p256dh" is null and "auth" is null and "environment" is null and "app_id" is null)
  );

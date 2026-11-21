-- The channel a workspace opens at, its #general: true on the one the workspace started with, NULL on every other. The
-- chat's `/` finds it by this mark, through the index its filter needs, so renaming the channel keeps it the start.

alter table public.channels add column is_default boolean;
create index channels_default on public.channels (is_default, organization_id);

-- The workspaces made before this mark started with a public #general too, which the sign-in hook added.
update public.channels set is_default = true where kind = 'public' and name = 'general';

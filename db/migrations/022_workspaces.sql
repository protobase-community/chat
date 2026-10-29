-- One row per workspace, the record its presence channel belongs to: whoever reads it, the workspace's members, sees
-- who of them is online or away. The chat adds a workspace's row the first time one of its members opens it.

create table public.workspaces (
  organization_id text primary key,
  created_at timestamptz not null default now()
);

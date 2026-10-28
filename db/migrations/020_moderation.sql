-- Moderation: a workspace's moderator deletes anyone's messages and files, a participant only their own, which the API
-- reads by the files' author_id: the index serves that row filter.

create index attachments_author on public.attachments (author_id);

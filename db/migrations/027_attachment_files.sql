-- The attachments that hold a file, found by the file's key, so a file cleanup checks them by index.
create index attachments_file on public.attachments ((split_part(file, '?', 1)));

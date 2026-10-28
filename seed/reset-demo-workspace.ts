import type postgres from 'postgres'
import type { AdminAuth } from '@protobase/server'
import { seedDemoWorkspace } from './demo-workspace'

/**
 * Returns the demo workspace to the seed's state: every message, thread, reaction, file, read position, channel and
 * direct message in it goes, visitors' and the seed's alike, and the seed writes its own again, as of `today`, in the
 * same transaction, so nobody sees the workspace empty. Other workspaces and every account stay as they are, the demo
 * workspace's members too. `deleteFiles` gets the stored files of the attachments it took, once that has committed:
 * SQL schedules no file's deletion, as the API does.
 * Answers the passwords of the demo people it created, as the seed does.
 */
export const resetDemoWorkspace = async (auth: AdminAuth, sql: postgres.Sql, today: Date, deleteFiles: (files: string[]) => Promise<void>) => {
  let files: string[] = []
  const created = await seedDemoWorkspace(auth, sql, today, async (tx, organizationId) => {
    await tx`delete from public.reactions where organization_id = ${organizationId}`
    await tx`delete from public.read_positions where organization_id = ${organizationId}`
    const taken = await tx<{ file: string }[]>`delete from public.attachments where organization_id = ${organizationId} returning file`
    files = taken.map((row) => row.file)
    // In one statement, so a thread's first message and its replies go together.
    await tx`delete from public.messages where organization_id = ${organizationId}`
    await tx`delete from public.channels where organization_id = ${organizationId}`
    await tx`delete from public.direct_messages where organization_id = ${organizationId}`
  })
  await deleteFiles(files)
  return created
}

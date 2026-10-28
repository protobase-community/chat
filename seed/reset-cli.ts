import { loadProjectAuth } from '@protobase/cli/auth'
import { storageCleanupSchedule, storageProvider } from '@protobase/server'
import config from '../protobase.config'
import { connect } from '../db/connection'
import { scheduledDelete } from './file-deletes'
import { resetDemoWorkspace } from './reset-demo-workspace'

// `bun run db:seed`: the demo workspace back to the seed's state, what visitors wrote in it gone, as the hourly reset of
// the hosted demo runs it.

// The config declares no file providers, so the environment's settings over Protobase's defaults name them, as for the
// app; one that did would need them resolved as the app does.
if (config.files) throw new Error('Not implemented: the reset resolves file providers from the environment alone, and protobase.config.ts sets files')
const { name, provider } = storageProvider({}, process.env)
const schedule = storageCleanupSchedule({ [name]: provider })
// The files go at the next cleanup run, or after the provider's retention when it sets one: they were visitors'.
const deleteFiles = async (files: string[]) => {
  const due = new Date(Date.now() + (provider.retention ?? 0))
  await schedule.add(files.map((file) => scheduledDelete(file, due)))
}

const auth = await loadProjectAuth(process.cwd())
const sql = connect({ max: 1 })
const created = await resetDemoWorkspace(auth, sql, new Date(), deleteFiles)
await sql.end()

console.log('reset the demo workspace')
for (const person of created) console.log(`  ${person.email}  password: ${person.password}`)
// The sign-in keeps a pool of its own open, so the script ends itself.
process.exit(0)

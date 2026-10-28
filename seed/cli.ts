import { loadProjectAuth } from '@protobase/cli/auth'
import { connect } from '../db/connection'
import { seedDemoWorkspace } from './demo-workspace'

// `bun run seed`: the demo workspace, with #general, #random, the private #launch, a direct message, three people and
// their conversation.

const auth = await loadProjectAuth(process.cwd())
const sql = connect({ max: 1 })
const created = await seedDemoWorkspace(auth, sql, new Date())
await sql.end()

console.log('seeded the demo workspace')
for (const person of created) console.log(`  ${person.email}  password: ${person.password}`)
// The sign-in keeps a pool of its own open, so the script ends itself.
process.exit(0)

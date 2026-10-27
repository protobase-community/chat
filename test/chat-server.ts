import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

// The app as it runs: `protobase dev` over a database of its own on DATABASE_URL's server, made for one test file,
// migrated with the project's db:migrate and dropped afterwards.

export const root = fileURLToPath(new URL('..', import.meta.url))
const protobase = join(root, 'node_modules', '.bin', 'protobase')

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address !== 'object') return reject(new Error('No port to listen on'))
      server.close(() => resolve(address.port))
    })
  })

/** A database of its own, migrated: its URL, and dropping it. */
export const throwawayDatabase = async () => {
  const server = process.env.DATABASE_URL
  if (!server) throw new Error('DATABASE_URL is not set; the tests make their own database on its server')
  const name = `chat_test_${process.pid}_${Date.now()}`
  const admin = postgres(server, { max: 1, onnotice: () => {} })
  await admin.unsafe(`create database ${name}`)
  const url = new URL(server)
  url.pathname = `/${name}`
  const databaseUrl = url.toString()

  const migrate = spawnSync(protobase, ['run', 'db/migrate.ts'], { cwd: root, env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: 'utf8' })
  if (migrate.status !== 0) throw new Error(`db:migrate failed:\n${migrate.stderr}`)

  const drop = async () => {
    await admin.unsafe(`drop database if exists ${name} with (force)`)
    await admin.end()
  }
  return { databaseUrl, drop }
}

/** `protobase dev` on a free port over `databaseUrl`, once it answers. */
export const startChat = async (databaseUrl: string) => {
  const port = await freePort()
  const url = `http://localhost:${port}`
  const cacheDir = mkdtempSync(join(tmpdir(), 'chat-vite-'))
  const child = spawn(protobase, ['dev', '--port', String(port), '--cache-dir', cacheDir], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: databaseUrl, PROTOBASE_URL: url },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', (chunk) => (output += chunk))
  child.stderr.on('data', (chunk) => (output += chunk))

  const stop = async () => {
    child.kill('SIGTERM')
    await new Promise((resolve) => (child.exitCode === null ? child.once('exit', resolve) : resolve(undefined)))
    rmSync(cacheDir, { recursive: true, force: true })
  }

  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`protobase dev stopped:\n${output}`)
    const status = await fetch(`${url}/api/auth/status`).catch(() => undefined)
    if (status?.ok) return { url, stop }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  await stop()
  throw new Error(`protobase dev did not answer within 90 seconds:\n${output}`)
}

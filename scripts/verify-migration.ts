/**
 * Verify migration integrity: compare JSON source counts vs DB counts.
 *
 * Usage: npx tsx scripts/verify-migration.ts
 */

import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })
import fs from "node:fs"
import path from "node:path"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { eq, count } from "drizzle-orm"
import { agents } from "../lib/db/schema/agents"
import { teams } from "../lib/db/schema/teams"
import { meetings } from "../lib/db/schema/meetings"
import { meetingMessages } from "../lib/db/schema/meeting-messages"
import { memoryFacts } from "../lib/db/schema/memory-facts"
import { agentStats } from "../lib/db/schema/agent-stats"
import { decrypt } from "../lib/encryption"

const BOSSBOARD_DIR = process.env.BOSSBOARD_DIR || path.join(process.cwd(), "bossboard-data")
const TARGET_WORKSPACE_ID = process.env.TARGET_WORKSPACE_ID!

if (!TARGET_WORKSPACE_ID) throw new Error("TARGET_WORKSPACE_ID required")

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)

function readJson<T = unknown>(filename: string): T | null {
  const filepath = path.join(BOSSBOARD_DIR, filename)
  if (!fs.existsSync(filepath)) return null
  return JSON.parse(fs.readFileSync(filepath, "utf-8")) as T
}

async function verify() {
  console.log("🔍 Verifying migration integrity...\n")
  let allGood = true

  // Source counts
  const srcAgents = (readJson<unknown[]>("agents.json") || []).length
  const srcTeams = (readJson<unknown[]>("teams.json") || []).length
  const srcMemory = (readJson<unknown[]>("client-memory.json") || []).length
  const srcSessions = (readJson<{ messages?: unknown[] }[]>("research-history.json") || [])
  const srcWithMessages = srcSessions.filter(s => (s.messages?.length || 0) > 0).length
  const srcTotalMessages = srcSessions.reduce((sum, s) => sum + (s.messages?.length || 0), 0)

  // DB counts
  const [dbAgents] = await db.select({ count: count() }).from(agents).where(eq(agents.workspaceId, TARGET_WORKSPACE_ID))
  const [dbTeams] = await db.select({ count: count() }).from(teams).where(eq(teams.workspaceId, TARGET_WORKSPACE_ID))
  const [dbMemory] = await db.select({ count: count() }).from(memoryFacts).where(eq(memoryFacts.workspaceId, TARGET_WORKSPACE_ID))
  const [dbMeetings] = await db.select({ count: count() }).from(meetings).where(eq(meetings.workspaceId, TARGET_WORKSPACE_ID))
  const [dbMessages] = await db.select({ count: count() }).from(meetingMessages).where(eq(meetingMessages.workspaceId, TARGET_WORKSPACE_ID))
  const [dbStats] = await db.select({ count: count() }).from(agentStats).where(eq(agentStats.workspaceId, TARGET_WORKSPACE_ID))

  function check(label: string, expected: number, actual: number) {
    const ok = actual >= expected
    const icon = ok ? "✅" : "❌"
    console.log(`   ${icon} ${label}: ${actual} (expected ${expected})`)
    if (!ok) allGood = false
  }

  check("Agents", srcAgents, dbAgents.count)
  check("Teams", srcTeams, dbTeams.count)
  check("Memory Facts", srcMemory, dbMemory.count)
  check("Meetings (with msgs)", srcWithMessages, dbMeetings.count)
  check("Messages", srcTotalMessages, dbMessages.count)
  console.log(`   ℹ️  Stats entries: ${dbStats.count}`)

  // Test API key decryption
  console.log("\n🔑 Testing API key decryption...")
  const dbAgentList = await db.select({
    id: agents.id,
    name: agents.name,
    apiKeyEncrypted: agents.apiKeyEncrypted,
  }).from(agents).where(eq(agents.workspaceId, TARGET_WORKSPACE_ID))

  for (const a of dbAgentList) {
    if (!a.apiKeyEncrypted) {
      console.log(`   ⚠️  ${a.name}: no API key`)
      continue
    }
    try {
      const key = decrypt(a.apiKeyEncrypted)
      const masked = key.slice(0, 8) + "..." + key.slice(-4)
      console.log(`   ✅ ${a.name}: ${masked}`)
    } catch (err) {
      console.log(`   ❌ ${a.name}: decryption failed — ${(err as Error).message}`)
      allGood = false
    }
  }

  console.log()
  if (allGood) {
    console.log("✅ All checks passed!")
  } else {
    console.log("❌ Some checks failed — review above.")
  }

  await pool.end()
}

verify().catch((err) => {
  console.error("❌ Verification failed:", err)
  process.exit(1)
})

/**
 * Migration script: BossBoard JSON files → LEDGIO AI PostgreSQL
 *
 * Usage:
 *   1. Copy JSON files from server: scp bosscatdog@192.168.2.109:~/.bossboard/* ./bossboard-data/
 *   2. Set env vars (or use .env.local)
 *   3. Run: npx tsx scripts/migrate-from-bossboard.ts
 *
 * Required env:
 *   DATABASE_URL, ENCRYPTION_KEY (new GCM key),
 *   OLD_ENCRYPT_KEY (BossBoard CBC key, 32 chars)
 *   TARGET_WORKSPACE_ID (workspace to migrate into)
 *   TARGET_USER_ID (user who owns the data)
 */

import { config } from "dotenv"
// Load .env.local (Next.js convention)
config({ path: ".env.local" })
config({ path: ".env" })
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { encrypt } from "../lib/encryption"
import { agents } from "../lib/db/schema/agents"
import { teams } from "../lib/db/schema/teams"
import { teamAgents } from "../lib/db/schema/team-agents"
import { meetings } from "../lib/db/schema/meetings"
import { meetingMessages } from "../lib/db/schema/meeting-messages"
import { memoryFacts } from "../lib/db/schema/memory-facts"
import { agentStats } from "../lib/db/schema/agent-stats"

// === CONFIG ===
const BOSSBOARD_DIR = process.env.BOSSBOARD_DIR || path.join(process.cwd(), "bossboard-data")
const OLD_ENCRYPT_KEY = process.env.OLD_ENCRYPT_KEY!
const TARGET_WORKSPACE_ID = process.env.TARGET_WORKSPACE_ID!
const TARGET_USER_ID = process.env.TARGET_USER_ID!

if (!OLD_ENCRYPT_KEY) throw new Error("OLD_ENCRYPT_KEY is required (32-char BossBoard key)")
if (!TARGET_WORKSPACE_ID) throw new Error("TARGET_WORKSPACE_ID is required")
if (!TARGET_USER_ID) throw new Error("TARGET_USER_ID is required")

// === DB Connection ===
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)

// === Old BossBoard encryption (AES-256-CBC) ===
function oldDecrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(":")
  if (!ivHex || !encryptedHex) throw new Error(`Invalid encrypted format: ${text.slice(0, 20)}...`)
  const key = Buffer.from(OLD_ENCRYPT_KEY.padEnd(32, "0").slice(0, 32))
  const iv = Buffer.from(ivHex, "hex")
  const encrypted = Buffer.from(encryptedHex, "hex")
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}

// === Read JSON files ===
function readJson<T = unknown>(filename: string): T | null {
  const filepath = path.join(BOSSBOARD_DIR, filename)
  if (!fs.existsSync(filepath)) {
    console.log(`   ⚠️  File not found: ${filename}`)
    return null
  }
  return JSON.parse(fs.readFileSync(filepath, "utf-8")) as T
}

// === Map BossBoard "role" (phase) to our meeting_messages phase enum ===
function mapPhase(role: string): "clarification" | "analysis" | "finding" | "discussion" | "synthesis" | "quick_answer" | "system" {
  const phaseMap: Record<string, string> = {
    "finding": "finding",
    "discussion": "discussion",
    "synthesis": "synthesis",
    "clarification": "clarification",
    "analysis": "analysis",
    "quick_answer": "quick_answer",
    "system": "system",
    "chairman": "system",
    "opening": "system",
  }
  return (phaseMap[role] || "finding") as ReturnType<typeof mapPhase>
}

// === Infer meeting mode from message count + agent count ===
function inferMode(session: BossSession): "quick_ask" | "consult" | "full_board" {
  const msgCount = session.messages?.length || 0
  const agentCount = session.agentIds?.length || 0
  if (agentCount <= 1 && msgCount <= 1) return "quick_ask"
  if (agentCount <= 3 && msgCount <= 5) return "consult"
  return "full_board"
}

interface BossAgent {
  id: string
  name: string
  emoji: string
  provider: string
  apiKeyEncrypted: string
  baseUrl?: string
  model: string
  soul: string
  role: string
  active?: boolean
  useWebSearch?: boolean
  seniority?: number
  trustedUrls?: string[]
  mcpEndpoint?: string
  mcpAccessMode?: string
  createdAt: string
  updatedAt: string
}

interface BossTeam {
  id: string
  name: string
  emoji: string
  description?: string
  agentIds: string[]
  createdAt: string
  updatedAt: string
}

interface BossMemory {
  id: string
  key: string
  value: string
  source?: string
  createdAt: string
  updatedAt: string
}

interface BossMessage {
  id: string
  agentId: string
  agentName: string
  agentEmoji: string
  role: string
  content: string
  tokensUsed?: number
  timestamp: string
}

interface BossSession {
  id: string
  question: string
  agentIds?: string[]
  status?: string
  startedAt: string
  completedAt?: string
  messages?: BossMessage[]
  totalTokens?: number
  finalAnswer?: string
}

interface BossStats {
  [agentId: string]: {
    agentId: string
    totalSessions: number
    totalInputTokens: number
    totalOutputTokens: number
    lastUsed: string
    daily: Array<{
      date: string
      sessions: number
      inputTokens: number
      outputTokens: number
    }>
  }
}

async function migrate() {
  console.log("🚀 Starting migration: BossBoard → LEDGIO AI")
  console.log(`   Source: ${BOSSBOARD_DIR}`)
  console.log(`   Target workspace: ${TARGET_WORKSPACE_ID}`)
  console.log(`   Target user: ${TARGET_USER_ID}`)
  console.log()

  const agentIdMap = new Map<string, string>() // old ID → new UUID

  // ========== 1. AGENTS ==========
  console.log("1️⃣  Migrating agents...")
  const oldAgents = readJson<BossAgent[]>("agents.json") || []

  for (const a of oldAgents) {
    // Decrypt old CBC key and re-encrypt with new GCM
    let reEncrypted = ""
    try {
      const plainKey = oldDecrypt(a.apiKeyEncrypted)
      reEncrypted = encrypt(plainKey)
    } catch (err) {
      console.log(`   ⚠️  Could not decrypt API key for ${a.name}: ${(err as Error).message}`)
    }

    const [newAgent] = await db.insert(agents).values({
      workspaceId: TARGET_WORKSPACE_ID,
      name: a.name,
      emoji: a.emoji,
      role: a.role,
      soul: a.soul,
      provider: a.provider as "openrouter" | "openai" | "anthropic" | "gemini" | "ollama" | "custom",
      model: a.model,
      apiKeyEncrypted: reEncrypted,
      baseUrl: a.baseUrl || null,
      seniority: a.seniority ?? 50,
      useWebSearch: a.useWebSearch ?? false,
      trustedUrls: a.trustedUrls ? JSON.stringify(a.trustedUrls) : null,
      mcpEndpoint: a.mcpEndpoint || null,
      mcpAccessMode: a.mcpAccessMode || null,
      isActive: a.active ?? true,
      createdAt: new Date(a.createdAt),
      updatedAt: new Date(a.updatedAt),
    }).returning()

    agentIdMap.set(a.id, newAgent.id)
    console.log(`   ✅ ${a.emoji} ${a.name} (${a.id} → ${newAgent.id})`)
  }

  // ========== 2. TEAMS ==========
  console.log("\n2️⃣  Migrating teams...")
  const oldTeams = readJson<BossTeam[]>("teams.json") || []

  for (const t of oldTeams) {
    const [newTeam] = await db.insert(teams).values({
      workspaceId: TARGET_WORKSPACE_ID,
      name: t.name,
      emoji: t.emoji,
      description: t.description || null,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    }).returning()

    // Link agents to team
    for (const oldAgentId of t.agentIds) {
      const newAgentId = agentIdMap.get(oldAgentId)
      if (newAgentId) {
        await db.insert(teamAgents).values({
          teamId: newTeam.id,
          agentId: newAgentId,
        })
      } else {
        console.log(`   ⚠️  Agent ${oldAgentId} not found in migration map`)
      }
    }
    console.log(`   ✅ ${t.emoji} ${t.name} (${t.agentIds.length} agents)`)
  }

  // ========== 3. MEMORY FACTS ==========
  console.log("\n3️⃣  Migrating memory facts...")
  const oldMemory = readJson<BossMemory[]>("client-memory.json") || []

  for (const m of oldMemory) {
    await db.insert(memoryFacts).values({
      workspaceId: TARGET_WORKSPACE_ID,
      key: m.key,
      value: m.value,
      source: m.source || null,
      category: "business",
      confidence: 100,
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
    })
  }
  console.log(`   ✅ ${oldMemory.length} memory facts`)

  // ========== 4. RESEARCH HISTORY → MEETINGS ==========
  console.log("\n4️⃣  Migrating research sessions → meetings...")
  const oldSessions = readJson<BossSession[]>("research-history.json") || []

  // Only migrate sessions with actual messages
  const validSessions = oldSessions.filter(s => (s.messages?.length || 0) > 0)
  console.log(`   📊 ${oldSessions.length} total sessions, ${validSessions.length} with messages`)

  for (const s of validSessions) {
    const newAgentIds = (s.agentIds || [])
      .map(id => agentIdMap.get(id))
      .filter(Boolean) as string[]

    const mode = inferMode(s)
    const status = s.status === "completed" ? "completed" : s.status === "error" ? "error" : "completed"

    const [newMeeting] = await db.insert(meetings).values({
      workspaceId: TARGET_WORKSPACE_ID,
      userId: TARGET_USER_ID,
      question: s.question,
      mode: mode,
      status: status as "completed" | "error" | "running" | "cancelled",
      agentIds: JSON.stringify(newAgentIds),
      finalAnswer: s.finalAnswer || null,
      totalTokens: s.totalTokens || 0,
      startedAt: new Date(s.startedAt),
      completedAt: s.completedAt ? new Date(s.completedAt) : new Date(s.startedAt),
    }).returning()

    // Migrate messages
    for (const m of (s.messages || [])) {
      const newAgentId = agentIdMap.get(m.agentId) || m.agentId
      await db.insert(meetingMessages).values({
        meetingId: newMeeting.id,
        workspaceId: TARGET_WORKSPACE_ID,
        agentId: newAgentId,
        agentName: m.agentName,
        agentEmoji: m.agentEmoji,
        phase: mapPhase(m.role),
        content: m.content,
        tokensUsed: m.tokensUsed || 0,
        timestamp: new Date(m.timestamp),
      })
    }
    console.log(`   ✅ "${s.question.slice(0, 50)}..." (${s.messages?.length || 0} msgs, mode=${mode})`)
  }

  // ========== 5. AGENT STATS ==========
  console.log("\n5️⃣  Migrating agent stats...")
  const oldStats = readJson<BossStats>("agent-stats.json") || {}
  let statsCount = 0

  for (const [oldAgentId, stat] of Object.entries(oldStats)) {
    const newAgentId = agentIdMap.get(oldAgentId)
    if (!newAgentId || !stat.daily) {
      console.log(`   ⚠️  No mapping for agent ${oldAgentId}, skipping stats`)
      continue
    }

    for (const day of stat.daily) {
      await db.insert(agentStats).values({
        agentId: newAgentId,
        workspaceId: TARGET_WORKSPACE_ID,
        date: day.date,
        meetings: day.sessions || 0,
        inputTokens: day.inputTokens || 0,
        outputTokens: day.outputTokens || 0,
        cacheReadTokens: 0,
      }).onConflictDoNothing()
      statsCount++
    }
  }
  console.log(`   ✅ ${statsCount} stat entries`)

  // ========== SUMMARY ==========
  console.log("\n" + "=".repeat(50))
  console.log("📊 Migration Summary")
  console.log("=".repeat(50))
  console.log(`   Agents:       ${oldAgents.length}`)
  console.log(`   Teams:        ${oldTeams.length}`)
  console.log(`   Memory Facts: ${oldMemory.length}`)
  console.log(`   Meetings:     ${validSessions.length} (of ${oldSessions.length} total)`)
  console.log(`   Stats:        ${statsCount} entries`)
  console.log(`   API Keys:     re-encrypted CBC → GCM`)
  console.log("=".repeat(50))
  console.log("✅ Migration complete!")

  await pool.end()
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err)
  process.exit(1)
})

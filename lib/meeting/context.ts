/**
 * Meeting Context Builder
 * Assembles all context needed for a meeting:
 * workspace info, memory facts, file contexts, anti-hallucination rules
 */

import { db } from "@/lib/db"
import { memoryFacts, organization } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { getWorkspaceSettings } from "@/lib/db/queries/settings"

// ── Types ──────────────────────────────────────────────

export interface FileContext {
  filename: string
  content: string
  tokens: number
}

export interface MeetingContext {
  workspaceId: string
  workspaceInfo: string
  memoryFactsText: string
  fileContexts: FileContext[]
  antiHallucination: string
}

// ── Token budget (rough: 1 token ≈ 4 chars) ───────────

const MAX_CONTEXT_TOKENS = 12_000    // total budget for context
const CHARS_PER_TOKEN = 4

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function truncateToTokenBudget(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + "\n\n[...ข้อมูลถูกตัดทอนเนื่องจากเกิน context window]"
}

// ── Builder ────────────────────────────────────────────

export async function buildMeetingContext(
  workspaceId: string,
  fileContexts: FileContext[] = [],
): Promise<MeetingContext> {
  const [workspaceInfo, memoryFactsText] = await Promise.all([
    getWorkspaceInfoContext(workspaceId),
    getMemoryFactsContext(workspaceId),
  ])

  const antiHallucination = getAntiHallucinationRules()

  // Budget allocation: anti-hallucination (fixed ~300 tokens) → workspace (500) → memory (2000) → files (rest)
  const fixedTokens = estimateTokens(antiHallucination) + estimateTokens(workspaceInfo)
  const memoryBudget = Math.min(2000, MAX_CONTEXT_TOKENS - fixedTokens)
  const fileBudget = MAX_CONTEXT_TOKENS - fixedTokens - Math.min(estimateTokens(memoryFactsText), memoryBudget)

  const trimmedMemory = truncateToTokenBudget(memoryFactsText, memoryBudget)
  const trimmedFiles = fileContexts.map((fc) => {
    const perFileBudget = Math.floor(fileBudget / Math.max(fileContexts.length, 1))
    return {
      ...fc,
      content: truncateToTokenBudget(fc.content, perFileBudget),
      tokens: Math.min(fc.tokens, perFileBudget),
    }
  })

  return {
    workspaceId,
    workspaceInfo,
    memoryFactsText: trimmedMemory,
    fileContexts: trimmedFiles,
    antiHallucination,
  }
}

// ── Workspace Info ─────────────────────────────────────

async function getWorkspaceInfoContext(workspaceId: string): Promise<string> {
  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, workspaceId))
    .limit(1)

  const settings = await getWorkspaceSettings(workspaceId)

  const parts: string[] = []
  if (org?.name) parts.push(`ชื่อ Workspace: ${org.name}`)
  if (settings?.enableWebSearch) parts.push("Web Search: เปิดใช้งาน")
  if (settings?.enableMcp && settings?.mcpEndpoint) parts.push(`MCP: ${settings.mcpEndpoint}`)

  return parts.length > 0 ? parts.join("\n") : ""
}

// ── Memory Facts ───────────────────────────────────────

async function getMemoryFactsContext(workspaceId: string): Promise<string> {
  const facts = await db
    .select()
    .from(memoryFacts)
    .where(eq(memoryFacts.workspaceId, workspaceId))
    .orderBy(desc(memoryFacts.updatedAt))
    .limit(50)

  if (facts.length === 0) return ""

  return facts
    .map((f) => `- [${f.category ?? "other"}] ${f.key}: ${f.value}`)
    .join("\n")
}

// ── Anti-Hallucination Rules ───────────────────────────

export function getAntiHallucinationRules(): string {
  return `## กฎเหล็ก — ห้ามแต่งข้อมูล

- ห้ามสร้างเลขที่คำวินิจฉัย หรือคำพิพากษาที่ไม่แน่ใจ 100%
- ห้ามสร้างชื่อ พ.ร.บ. พ.ร.ก. ประกาศ มาตรา ที่ไม่มีอยู่จริง
- ถ้าอ้างมาตรากฎหมาย ต้องแน่ใจว่าเลขถูกต้อง ถ้าไม่แน่ใจให้บอกว่า "ต้องตรวจสอบมาตราที่แน่ชัดอีกครั้ง"
- ถ้า Web Search ให้ข้อมูลขัดแย้งกับความรู้เดิม → เชื่อ Web Search พร้อมระบุแหล่ง
- แยก "ข้อเท็จจริง" กับ "ความเห็น/การตีความ" ให้ชัดเจน
- ถ้าไม่รู้ ให้พูดตรงๆ ว่า "ไม่มีข้อมูลเพียงพอ ควรปรึกษาผู้เชี่ยวชาญเพิ่มเติม"`
}

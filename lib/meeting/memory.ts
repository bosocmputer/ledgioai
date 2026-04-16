/**
 * Memory Extraction — Auto-extract facts after meeting
 * Chairman agent extracts key facts → stored in memory_facts table
 */

import { db } from "@/lib/db"
import { memoryFacts } from "@/lib/db/schema"
import type { agents } from "@/lib/db/schema"
import { createMastraAgent } from "@/lib/mastra"
import { sql } from "drizzle-orm"

type AgentRow = typeof agents.$inferSelect

export interface MemoryFact {
  key: string
  value: string
  category: string
}

export async function extractMemoryFacts(
  synthesis: string,
  chairman: AgentRow,
  workspaceId: string,
  meetingId: string,
): Promise<MemoryFact[]> {
  const mastraAgent = createMastraAgent(chairman, "คุณเป็นผู้ช่วยสกัดข้อเท็จจริงสำคัญจากการประชุม")

  const result = await mastraAgent.generate([
    {
      role: "user",
      content: `จากสรุปการประชุมนี้ กรุณาสกัดข้อเท็จจริงสำคัญของบริษัทเป็น JSON array:

สรุป:
${synthesis}

Format: [{"key": "vat_status", "value": "จดทะเบียน VAT", "category": "tax"}]

กฎ:
- เก็บเฉพาะข้อเท็จจริงถาวร ไม่ใช่ความเห็นชั่วคราว
- key เป็น snake_case ภาษาอังกฤษ
- category: "tax" | "company" | "employee" | "accounting" | "legal" | "other"
- ถ้าไม่มีข้อเท็จจริงใหม่ ให้ return []`,
    },
  ])

  try {
    const match = result.text.match(/\[[\s\S]*\]/)
    if (!match) return []
    const facts = JSON.parse(match[0]) as MemoryFact[]
    if (!Array.isArray(facts)) return []

    // Validate and upsert into DB
    const validFacts = facts.filter(
      (f) => f.key && f.value && typeof f.key === "string" && typeof f.value === "string",
    )

    for (const fact of validFacts) {
      await db
        .insert(memoryFacts)
        .values({
          workspaceId,
          key: fact.key,
          value: fact.value,
          category: fact.category || "other",
          source: `meeting:${meetingId}`,
        })
        .onConflictDoUpdate({
          target: [memoryFacts.workspaceId, memoryFacts.key],
          set: {
            value: fact.value,
            category: fact.category || "other",
            source: `meeting:${meetingId}`,
            updatedAt: sql`now()`,
          },
        })
    }

    return validFacts
  } catch {
    return []
  }
}

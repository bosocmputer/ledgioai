/**
 * Memory Facts — DB Queries
 * All operations on memory_facts table (scoped by workspaceId)
 */

import { db } from "@/lib/db"
import { memoryFacts } from "@/lib/db/schema"
import { eq, and, desc, ilike, or, isNull, sql } from "drizzle-orm"

// ── Types ──────────────────────────────────────────────

export interface MemoryFactInput {
  workspaceId: string
  key: string
  value: string
  category?: string
  source?: string
  confidence?: number
}

// ── Read ───────────────────────────────────────────────

export async function getMemoryFactsByWorkspace(
  workspaceId: string,
  opts?: { category?: string; search?: string; limit?: number; offset?: number },
) {
  const conditions = [eq(memoryFacts.workspaceId, workspaceId)]

  if (opts?.category) {
    conditions.push(eq(memoryFacts.category, opts.category))
  }

  if (opts?.search) {
    const pattern = `%${opts.search}%`
    conditions.push(
      or(
        ilike(memoryFacts.key, pattern),
        ilike(memoryFacts.value, pattern),
      )!,
    )
  }

  return db
    .select()
    .from(memoryFacts)
    .where(and(...conditions))
    .orderBy(desc(memoryFacts.updatedAt))
    .limit(opts?.limit ?? 100)
    .offset(opts?.offset ?? 0)
}

export async function getMemoryFactById(id: string, workspaceId: string) {
  const [fact] = await db
    .select()
    .from(memoryFacts)
    .where(and(eq(memoryFacts.id, id), eq(memoryFacts.workspaceId, workspaceId)))
    .limit(1)
  return fact ?? null
}

export async function countMemoryFacts(workspaceId: string, category?: string) {
  const conditions = [eq(memoryFacts.workspaceId, workspaceId)]
  if (category) {
    conditions.push(eq(memoryFacts.category, category))
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(memoryFacts)
    .where(and(...conditions))

  return result?.count ?? 0
}

export async function getMemoryCategories(workspaceId: string) {
  const rows = await db
    .select({
      category: memoryFacts.category,
      count: sql<number>`count(*)::int`,
    })
    .from(memoryFacts)
    .where(eq(memoryFacts.workspaceId, workspaceId))
    .groupBy(memoryFacts.category)
    .orderBy(desc(sql`count(*)`))

  return rows
}

// ── Write ──────────────────────────────────────────────

export async function createMemoryFact(data: MemoryFactInput) {
  const [fact] = await db
    .insert(memoryFacts)
    .values(data)
    .returning()
  return fact
}

export async function upsertMemoryFact(data: MemoryFactInput) {
  const [fact] = await db
    .insert(memoryFacts)
    .values(data)
    .onConflictDoUpdate({
      target: [memoryFacts.workspaceId, memoryFacts.key],
      set: {
        value: data.value,
        category: data.category,
        source: data.source,
        confidence: data.confidence,
        updatedAt: new Date(),
      },
    })
    .returning()
  return fact
}

export async function updateMemoryFact(
  id: string,
  workspaceId: string,
  data: Partial<Pick<MemoryFactInput, "value" | "category" | "confidence">>,
) {
  const [updated] = await db
    .update(memoryFacts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(memoryFacts.id, id), eq(memoryFacts.workspaceId, workspaceId)))
    .returning()
  return updated ?? null
}

export async function deleteMemoryFact(id: string, workspaceId: string) {
  const [deleted] = await db
    .delete(memoryFacts)
    .where(and(eq(memoryFacts.id, id), eq(memoryFacts.workspaceId, workspaceId)))
    .returning()
  return deleted ?? null
}

export async function deleteAllMemoryFacts(workspaceId: string) {
  const result = await db
    .delete(memoryFacts)
    .where(eq(memoryFacts.workspaceId, workspaceId))
    .returning({ id: memoryFacts.id })
  return result.length
}

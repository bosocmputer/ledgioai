/**
 * Meeting & Meeting Messages DB queries
 * All meeting-related database operations
 */

import { db } from "@/lib/db"
import { meetings, meetingMessages, agentStats } from "@/lib/db/schema"
import { eq, and, desc, sql, ilike } from "drizzle-orm"

// ── Meetings ───────────────────────────────────────────

export async function createMeeting(data: typeof meetings.$inferInsert) {
  const [meeting] = await db.insert(meetings).values(data).returning()
  return meeting
}

export async function updateMeeting(
  meetingId: string,
  workspaceId: string,
  data: Partial<typeof meetings.$inferInsert>,
) {
  const [meeting] = await db
    .update(meetings)
    .set(data)
    .where(and(eq(meetings.id, meetingId), eq(meetings.workspaceId, workspaceId)))
    .returning()
  return meeting ?? null
}

export async function getMeetingsByWorkspace(
  workspaceId: string,
  limit = 50,
  offset = 0,
  search?: string,
) {
  const conditions = [eq(meetings.workspaceId, workspaceId)]

  if (search) {
    conditions.push(ilike(meetings.question, `%${search}%`))
  }

  return db
    .select()
    .from(meetings)
    .where(and(...conditions))
    .orderBy(desc(meetings.startedAt))
    .limit(limit)
    .offset(offset)
}

export async function getMeetingById(meetingId: string, workspaceId: string) {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.workspaceId, workspaceId)))
    .limit(1)
  return meeting ?? null
}

// ── Meeting Messages ───────────────────────────────────

export async function createMeetingMessage(data: typeof meetingMessages.$inferInsert) {
  const [message] = await db.insert(meetingMessages).values(data).returning()
  return message
}

export async function createMeetingMessages(data: (typeof meetingMessages.$inferInsert)[]) {
  if (data.length === 0) return []
  return db.insert(meetingMessages).values(data).returning()
}

export async function getMessagesByMeeting(meetingId: string, workspaceId: string) {
  return db
    .select()
    .from(meetingMessages)
    .where(
      and(
        eq(meetingMessages.meetingId, meetingId),
        eq(meetingMessages.workspaceId, workspaceId),
      ),
    )
    .orderBy(meetingMessages.timestamp)
}

// ── Agent Stats ────────────────────────────────────────

export async function updateAgentStats(
  agentId: string,
  workspaceId: string,
  inputTokens: number,
  outputTokens: number,
) {
  const today = new Date().toISOString().slice(0, 10)

  await db
    .insert(agentStats)
    .values({
      agentId,
      workspaceId,
      date: today,
      meetings: 1,
      inputTokens,
      outputTokens,
      cacheReadTokens: 0,
    })
    .onConflictDoUpdate({
      target: [agentStats.agentId, agentStats.date],
      set: {
        meetings: sql`${agentStats.meetings} + 1`,
        inputTokens: sql`${agentStats.inputTokens} + ${inputTokens}`,
        outputTokens: sql`${agentStats.outputTokens} + ${outputTokens}`,
      },
    })
}

// ── Meeting History Stats ──────────────────────────────

export async function getMeetingStats(workspaceId: string) {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      totalTokens: sql<number>`coalesce(sum(${meetings.totalTokens}), 0)::int`,
    })
    .from(meetings)
    .where(eq(meetings.workspaceId, workspaceId))

  return stats ?? { total: 0, totalTokens: 0 }
}

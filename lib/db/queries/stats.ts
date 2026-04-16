/**
 * Dashboard & Stats DB queries
 */

import { db } from "@/lib/db"
import { agents, teams, meetings, memoryFacts, agentStats } from "@/lib/db/schema"
import { eq, and, isNull, sql, desc, gte } from "drizzle-orm"

// ── Dashboard Overview ─────────────────────────────────

export async function getDashboardStats(workspaceId: string) {
  const [agentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agents)
    .where(and(eq(agents.workspaceId, workspaceId), isNull(agents.deletedAt)))

  const [teamCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(teams)
    .where(and(eq(teams.workspaceId, workspaceId), isNull(teams.deletedAt)))

  const [meetingCount] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalTokens: sql<number>`coalesce(sum(${meetings.totalTokens}), 0)::int`,
    })
    .from(meetings)
    .where(eq(meetings.workspaceId, workspaceId))

  const [memoryCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(memoryFacts)
    .where(eq(memoryFacts.workspaceId, workspaceId))

  return {
    agents: agentCount?.count ?? 0,
    teams: teamCount?.count ?? 0,
    meetings: meetingCount?.count ?? 0,
    totalTokens: meetingCount?.totalTokens ?? 0,
    memoryFacts: memoryCount?.count ?? 0,
  }
}

// ── Recent Meetings ────────────────────────────────────

export async function getRecentMeetings(workspaceId: string, limit = 5) {
  return db
    .select({
      id: meetings.id,
      question: meetings.question,
      mode: meetings.mode,
      status: meetings.status,
      totalTokens: meetings.totalTokens,
      startedAt: meetings.startedAt,
    })
    .from(meetings)
    .where(eq(meetings.workspaceId, workspaceId))
    .orderBy(desc(meetings.startedAt))
    .limit(limit)
}

// ── Token Usage (last 7 days) ──────────────────────────

export async function getTokenUsage7Days(workspaceId: string) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const dateStr = sevenDaysAgo.toISOString().slice(0, 10)

  return db
    .select({
      date: agentStats.date,
      inputTokens: sql<number>`sum(${agentStats.inputTokens})::int`,
      outputTokens: sql<number>`sum(${agentStats.outputTokens})::int`,
      meetings: sql<number>`sum(${agentStats.meetings})::int`,
    })
    .from(agentStats)
    .where(
      and(
        eq(agentStats.workspaceId, workspaceId),
        gte(agentStats.date, dateStr),
      ),
    )
    .groupBy(agentStats.date)
    .orderBy(agentStats.date)
}

// ── Meeting Mode Distribution ──────────────────────────

export async function getMeetingModeDistribution(workspaceId: string) {
  return db
    .select({
      mode: meetings.mode,
      count: sql<number>`count(*)::int`,
    })
    .from(meetings)
    .where(eq(meetings.workspaceId, workspaceId))
    .groupBy(meetings.mode)
}

// ── Top Agents by Token Usage ──────────────────────────

export async function getTopAgentsByTokens(workspaceId: string, limit = 5) {
  return db
    .select({
      agentId: agentStats.agentId,
      agentName: agents.name,
      agentEmoji: agents.emoji,
      totalInput: sql<number>`sum(${agentStats.inputTokens})::int`,
      totalOutput: sql<number>`sum(${agentStats.outputTokens})::int`,
      totalMeetings: sql<number>`sum(${agentStats.meetings})::int`,
    })
    .from(agentStats)
    .innerJoin(agents, eq(agents.id, agentStats.agentId))
    .where(eq(agentStats.workspaceId, workspaceId))
    .groupBy(agentStats.agentId, agents.name, agents.emoji)
    .orderBy(sql`sum(${agentStats.inputTokens}) + sum(${agentStats.outputTokens}) desc`)
    .limit(limit)
}

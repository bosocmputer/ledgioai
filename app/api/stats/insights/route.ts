import { requireAuth } from "@/lib/auth/helpers"
import { db } from "@/lib/db"
import { meetings, agents } from "@/lib/db/schema"
import { eq, and, sql, gte, desc } from "drizzle-orm"

export async function GET(request: Request) {
  const ctx = await requireAuth(request)
  if (ctx instanceof Response) return ctx
  const workspaceId = ctx.workspaceId

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Parallel queries for insights
  const [
    meetingsByDay,
    meetingsByMode,
    avgRating,
    tokensByDay,
    topQuestions,
    agentCount,
  ] = await Promise.all([
    // Meetings per day (last 30 days)
    db.execute(sql`
      SELECT DATE(started_at) as day, COUNT(*)::int as count
      FROM meetings
      WHERE workspace_id = ${workspaceId} AND started_at >= ${thirtyDaysAgo}
      GROUP BY DATE(started_at) ORDER BY day
    `),
    // By mode
    db.execute(sql`
      SELECT mode, COUNT(*)::int as count
      FROM meetings
      WHERE workspace_id = ${workspaceId} AND started_at >= ${thirtyDaysAgo}
      GROUP BY mode ORDER BY count DESC
    `),
    // Average rating
    db.execute(sql`
      SELECT AVG(rating)::float as avg_rating, COUNT(rating)::int as rated_count
      FROM meetings
      WHERE workspace_id = ${workspaceId} AND rating IS NOT NULL
    `),
    // Tokens per day (last 30 days)
    db.execute(sql`
      SELECT DATE(started_at) as day, SUM(total_tokens)::int as tokens
      FROM meetings
      WHERE workspace_id = ${workspaceId} AND started_at >= ${thirtyDaysAgo}
      GROUP BY DATE(started_at) ORDER BY day
    `),
    // Most asked questions (top 10 recent)
    db
      .select({ question: meetings.question, mode: meetings.mode })
      .from(meetings)
      .where(and(eq(meetings.workspaceId, workspaceId), gte(meetings.startedAt, thirtyDaysAgo)))
      .orderBy(desc(meetings.startedAt))
      .limit(10),
    // Total active agents
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(agents)
      .where(and(eq(agents.workspaceId, workspaceId), sql`deleted_at IS NULL`)),
  ])

  return Response.json({
    data: {
      meetingsByDay: meetingsByDay,
      meetingsByMode: meetingsByMode,
      avgRating: avgRating[0] ?? { avg_rating: null, rated_count: 0 },
      tokensByDay: tokensByDay,
      topQuestions,
      agentCount: agentCount[0]?.count ?? 0,
    },
  })
}

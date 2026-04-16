import { requireAuth } from "@/lib/auth/helpers"
import { db } from "@/lib/db"
import { meetings, agents } from "@/lib/db/schema"
import { eq, and, sql, gte, desc, isNull } from "drizzle-orm"

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth(request)
    if (ctx instanceof Response) return ctx
    const workspaceId = ctx.workspaceId

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Run queries sequentially to isolate any failing one
    let meetingsByDay: unknown[] = []
    let meetingsByMode: unknown[] = []
    let avgRating: unknown[] = []
    let tokensByDay: unknown[] = []
    let topQuestions: unknown[] = []
    let agentCount: unknown[] = []

    try {
      meetingsByDay = await db
        .select({
          day: sql<string>`DATE(${meetings.startedAt})`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(meetings)
        .where(and(eq(meetings.workspaceId, workspaceId), gte(meetings.startedAt, thirtyDaysAgo)))
        .groupBy(sql`DATE(${meetings.startedAt})`)
        .orderBy(sql`DATE(${meetings.startedAt})`)
    } catch (e) {
      console.error("meetingsByDay error:", e)
    }

    try {
      meetingsByMode = await db
        .select({
          mode: meetings.mode,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(meetings)
        .where(and(eq(meetings.workspaceId, workspaceId), gte(meetings.startedAt, thirtyDaysAgo)))
        .groupBy(meetings.mode)
        .orderBy(sql`COUNT(*) DESC`)
    } catch (e) {
      console.error("meetingsByMode error:", e)
    }

    try {
      avgRating = await db
        .select({
          avg_rating: sql<number | null>`AVG(${meetings.rating})::float`,
          rated_count: sql<number>`COUNT(${meetings.rating})::int`,
        })
        .from(meetings)
        .where(and(eq(meetings.workspaceId, workspaceId), sql`${meetings.rating} IS NOT NULL`))
    } catch (e) {
      console.error("avgRating error:", e)
    }

    try {
      tokensByDay = await db
        .select({
          day: sql<string>`DATE(${meetings.startedAt})`,
          tokens: sql<number>`COALESCE(SUM(${meetings.totalTokens}), 0)::int`,
        })
        .from(meetings)
        .where(and(eq(meetings.workspaceId, workspaceId), gte(meetings.startedAt, thirtyDaysAgo)))
        .groupBy(sql`DATE(${meetings.startedAt})`)
        .orderBy(sql`DATE(${meetings.startedAt})`)
    } catch (e) {
      console.error("tokensByDay error:", e)
    }

    try {
      topQuestions = await db
        .select({ question: meetings.question, mode: meetings.mode })
        .from(meetings)
        .where(and(eq(meetings.workspaceId, workspaceId), gte(meetings.startedAt, thirtyDaysAgo)))
        .orderBy(desc(meetings.startedAt))
        .limit(10)
    } catch (e) {
      console.error("topQuestions error:", e)
    }

    try {
      agentCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(agents)
        .where(and(eq(agents.workspaceId, workspaceId), isNull(agents.deletedAt)))
    } catch (e) {
      console.error("agentCount error:", e)
    }

    return Response.json({
      data: {
        meetingsByDay,
        meetingsByMode,
        avgRating: (avgRating as Array<{ avg_rating: number | null; rated_count: number }>)[0] ?? { avg_rating: null, rated_count: 0 },
        tokensByDay,
        topQuestions,
        agentCount: (agentCount as Array<{ count: number }>)[0]?.count ?? 0,
      },
    })
  } catch (error) {
    console.error("[GET /api/stats/insights] Error:", error)
    return Response.json({
      data: {
        meetingsByDay: [],
        meetingsByMode: [],
        avgRating: { avg_rating: null, rated_count: 0 },
        tokensByDay: [],
        topQuestions: [],
        agentCount: 0,
      },
    })
  }
}

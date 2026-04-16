import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import {
  getDashboardStats,
  getRecentMeetings,
  getTokenUsage7Days,
  getMeetingModeDistribution,
  getTopAgentsByTokens,
} from "@/lib/db/queries/stats"

// GET /api/stats — Dashboard statistics
export async function GET(request: NextRequest) {
  const ctx = await requirePermission(request, "meeting:read")
  if (ctx instanceof Response) return ctx

  const [overview, recentMeetings, tokenUsage, modeDistribution, topAgents] = await Promise.all([
    getDashboardStats(ctx.workspaceId),
    getRecentMeetings(ctx.workspaceId),
    getTokenUsage7Days(ctx.workspaceId),
    getMeetingModeDistribution(ctx.workspaceId),
    getTopAgentsByTokens(ctx.workspaceId),
  ])

  return NextResponse.json({
    overview,
    recentMeetings,
    tokenUsage,
    modeDistribution,
    topAgents,
  })
}

import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import { getMeetingsByWorkspace, getMeetingStats } from "@/lib/db/queries/meetings"

// GET /api/meetings — List meetings history
export async function GET(request: NextRequest) {
  const ctx = await requirePermission(request, "meeting:read")
  if (ctx instanceof Response) return ctx

  try {
    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100)
    const offset = parseInt(url.searchParams.get("offset") ?? "0")
    const search = url.searchParams.get("search") ?? undefined

    const [meetingList, stats] = await Promise.all([
      getMeetingsByWorkspace(ctx.workspaceId, limit, offset, search),
      getMeetingStats(ctx.workspaceId),
    ])

    return NextResponse.json({ data: meetingList, stats })
  } catch (error) {
    console.error("[GET /api/meetings] Error:", error)
    return NextResponse.json({ data: [], stats: { total: 0, totalTokens: 0 } })
  }
}

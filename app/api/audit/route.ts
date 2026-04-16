import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import { getAuditLogs } from "@/lib/db/queries/audit"

// GET /api/audit — List audit logs (owner/admin only)
export async function GET(request: NextRequest) {
  const ctx = await requirePermission(request, "settings:read")
  if (ctx instanceof Response) return ctx

  if (!["owner", "admin"].includes(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200)
  const offset = parseInt(url.searchParams.get("offset") ?? "0")

  const logs = await getAuditLogs(ctx.workspaceId, { limit, offset })

  return NextResponse.json({ data: logs })
}

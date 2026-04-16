import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import { exportWorkspaceData, deleteWorkspaceData } from "@/lib/db/queries/compliance"
import { logger } from "@/lib/logger"

// GET /api/compliance/export — Export all workspace data (PDPA right to access)
export async function GET(request: NextRequest) {
  const ctx = await requirePermission(request, "settings:read")
  if (ctx instanceof Response) return ctx

  const data = await exportWorkspaceData(ctx.workspaceId)

  logger.info(
    { workspaceId: ctx.workspaceId, userId: ctx.userId },
    "PDPA data export requested"
  )

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="workspace-${ctx.workspaceId}-export.json"`,
    },
  })
}

// DELETE /api/compliance/export — Delete all workspace data (PDPA right to be forgotten)
// Only workspace owner can do this
export async function DELETE(request: NextRequest) {
  const ctx = await requirePermission(request, "settings:update")
  if (ctx instanceof Response) return ctx

  // Extra safety: only owner can delete all data
  if (ctx.role !== "owner") {
    return NextResponse.json({ error: "Only workspace owner can delete all data" }, { status: 403 })
  }

  logger.warn(
    { workspaceId: ctx.workspaceId, userId: ctx.userId },
    "PDPA data deletion requested — deleting all workspace data"
  )

  const result = await deleteWorkspaceData(ctx.workspaceId)

  logger.info(
    { workspaceId: ctx.workspaceId, userId: ctx.userId, ...result },
    "PDPA data deletion completed"
  )

  return NextResponse.json({ deleted: result })
}

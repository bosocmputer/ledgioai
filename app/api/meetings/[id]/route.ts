import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import { getMeetingById, getMessagesByMeeting } from "@/lib/db/queries/meetings"

// GET /api/meetings/[id] — Get meeting detail + messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePermission(request, "meeting:read")
  if (ctx instanceof Response) return ctx

  const { id } = await params

  const [meeting, messages] = await Promise.all([
    getMeetingById(id, ctx.workspaceId),
    getMessagesByMeeting(id, ctx.workspaceId),
  ])

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
  }

  return NextResponse.json({ data: { ...meeting, messages } })
}

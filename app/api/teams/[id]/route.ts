import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import { getTeamById, updateTeam, softDeleteTeam } from "@/lib/db/queries/teams"
import { updateTeamSchema, parseBody } from "@/lib/validations"
import { logAudit } from "@/lib/db/queries/audit"

// GET /api/teams/[id] — Team detail with agents
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await requirePermission(request, "agent:read")
  if (ctx instanceof Response) return ctx

  const team = await getTeamById(id, ctx.workspaceId)
  if (!team) {
    return NextResponse.json({ error: "Team ไม่พบ" }, { status: 404 })
  }

  // Strip apiKeyEncrypted from nested agents
  const safe = {
    ...team,
    agents: team.agents.map((a) => {
      const { apiKeyEncrypted, ...rest } = a
      return { ...rest, hasApiKey: !!apiKeyEncrypted }
    }),
  }

  return NextResponse.json({ data: safe })
}

// PUT /api/teams/[id] — Update team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await requirePermission(request, "agent:update")
  if (ctx instanceof Response) return ctx

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Request body is required" }, { status: 400 })
  }
  const parsed = parseBody(updateTeamSchema, body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { name, emoji, description, agentIds } = parsed.data

  const team = await updateTeam(
    id,
    ctx.workspaceId,
    {
      ...(name !== undefined && { name }),
      ...(emoji !== undefined && { emoji }),
      ...(description !== undefined && { description }),
    },
    agentIds
  )

  if (!team) {
    return NextResponse.json({ error: "Team ไม่พบ" }, { status: 404 })
  }

  return NextResponse.json({ data: team })
}

// DELETE /api/teams/[id] — Soft delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await requirePermission(request, "agent:delete")
  if (ctx instanceof Response) return ctx

  const team = await softDeleteTeam(id, ctx.workspaceId)
  if (!team) {
    return NextResponse.json({ error: "Team ไม่พบ" }, { status: 404 })
  }

  logAudit({
    workspaceId: ctx.workspaceId, userId: ctx.userId,
    action: "team.delete", resource: "team", resourceId: id,
  })

  return NextResponse.json({ success: true })
}

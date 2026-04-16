import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import { getTeamsByWorkspace, createTeam } from "@/lib/db/queries/teams"
import { createTeamSchema, parseBody } from "@/lib/validations"
import { rateLimitByUser } from "@/lib/rate-limit"
import { logAudit } from "@/lib/db/queries/audit"

// GET /api/teams — List teams with populated agents
export async function GET(request: NextRequest) {
  const ctx = await requirePermission(request, "agent:read")
  if (ctx instanceof Response) return ctx

  const data = await getTeamsByWorkspace(ctx.workspaceId)

  // Strip apiKeyEncrypted from nested agents
  const safe = data.map((team) => ({
    ...team,
    agents: team.agents.map((a) => {
      const { apiKeyEncrypted, ...rest } = a
      return { ...rest, hasApiKey: !!apiKeyEncrypted }
    }),
  }))

  return NextResponse.json({ data: safe })
}

// POST /api/teams — Create team
export async function POST(request: NextRequest) {
  const ctx = await requirePermission(request, "agent:create")
  if (ctx instanceof Response) return ctx

  const rl = await rateLimitByUser(ctx.userId, "mutation")
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Request body is required" }, { status: 400 })
  }
  const parsed = parseBody(createTeamSchema, body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { name, emoji, description, agentIds } = parsed.data

  const team = await createTeam(
    {
      workspaceId: ctx.workspaceId,
      name,
      emoji,
      description: description || null,
    },
    agentIds
  )

  logAudit({
    workspaceId: ctx.workspaceId, userId: ctx.userId,
    action: "team.create", resource: "team", resourceId: team.id,
    details: { name, agentCount: agentIds.length },
  })

  return NextResponse.json({ data: team }, { status: 201 })
}

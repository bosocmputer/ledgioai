import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import { getAgentById, updateAgent, softDeleteAgent } from "@/lib/db/queries/agents"
import { encrypt } from "@/lib/encryption"
import { updateAgentSchema, parseBody } from "@/lib/validations"
import { logAudit } from "@/lib/db/queries/audit"

// GET /api/agents/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await requirePermission(request, "agent:read")
  if (ctx instanceof Response) return ctx

  const agent = await getAgentById(id, ctx.workspaceId)
  if (!agent) {
    return NextResponse.json({ error: "Agent ไม่พบ" }, { status: 404 })
  }

  const { apiKeyEncrypted, ...publicAgent } = agent
  return NextResponse.json({
    data: {
      ...publicAgent,
      hasApiKey: !!apiKeyEncrypted,
      trustedUrls: publicAgent.trustedUrls ? JSON.parse(publicAgent.trustedUrls) : [],
    },
  })
}

// PUT /api/agents/[id]
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
  const parsed = parseBody(updateAgentSchema, body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const {
    name, emoji, provider, apiKey, baseUrl, model,
    soul, role, useWebSearch, seniority, isActive,
    mcpEndpoint, mcpAccessMode, trustedUrls,
  } = parsed.data

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (emoji !== undefined) updateData.emoji = emoji
  if (provider !== undefined) updateData.provider = provider
  if (model !== undefined) updateData.model = model
  if (soul !== undefined) updateData.soul = soul
  if (role !== undefined) updateData.role = role
  if (baseUrl !== undefined) updateData.baseUrl = baseUrl || null
  if (useWebSearch !== undefined) updateData.useWebSearch = useWebSearch
  if (seniority !== undefined) updateData.seniority = seniority
  if (isActive !== undefined) updateData.isActive = isActive
  if (mcpEndpoint !== undefined) updateData.mcpEndpoint = mcpEndpoint || null
  if (mcpAccessMode !== undefined) updateData.mcpAccessMode = mcpAccessMode || null
  if (trustedUrls !== undefined) updateData.trustedUrls = JSON.stringify(trustedUrls)

  // Only re-encrypt if new API key provided
  if (apiKey) {
    updateData.apiKeyEncrypted = encrypt(apiKey)
  }

  const agent = await updateAgent(id, ctx.workspaceId, updateData)
  if (!agent) {
    return NextResponse.json({ error: "Agent ไม่พบ" }, { status: 404 })
  }

  const { apiKeyEncrypted, ...publicAgent } = agent
  logAudit({
    workspaceId: ctx.workspaceId, userId: ctx.userId,
    action: "agent.update", resource: "agent", resourceId: id,
  })
  return NextResponse.json({
    data: { ...publicAgent, hasApiKey: !!apiKeyEncrypted },
  })
}

// DELETE /api/agents/[id] — soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await requirePermission(request, "agent:delete")
  if (ctx instanceof Response) return ctx

  const agent = await softDeleteAgent(id, ctx.workspaceId)
  if (!agent) {
    return NextResponse.json({ error: "Agent ไม่พบ" }, { status: 404 })
  }

  logAudit({
    workspaceId: ctx.workspaceId, userId: ctx.userId,
    action: "agent.delete", resource: "agent", resourceId: id,
  })

  return NextResponse.json({ ok: true })
}

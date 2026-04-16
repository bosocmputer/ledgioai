import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import { getAgentsByWorkspace, createAgent } from "@/lib/db/queries/agents"
import { encrypt } from "@/lib/encryption"
import { createAgentSchema, parseBody } from "@/lib/validations"
import { rateLimitByUser } from "@/lib/rate-limit"
import { logAudit } from "@/lib/db/queries/audit"

// GET /api/agents — List agents (scoped by workspace)
export async function GET(request: NextRequest) {
  const ctx = await requirePermission(request, "agent:read")
  if (ctx instanceof Response) return ctx

  const agentList = await getAgentsByWorkspace(ctx.workspaceId)

  // Never expose encrypted API key
  const data = agentList.map(({ apiKeyEncrypted, ...rest }) => ({
    ...rest,
    hasApiKey: !!apiKeyEncrypted,
    trustedUrls: rest.trustedUrls ? JSON.parse(rest.trustedUrls) : [],
  }))

  return NextResponse.json({ data })
}

// POST /api/agents — Create agent
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
  const parsed = parseBody(createAgentSchema, body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const {
    name, emoji, provider, apiKey, baseUrl, model,
    soul, role, useWebSearch, seniority,
    mcpEndpoint, mcpAccessMode, trustedUrls, templateId,
  } = parsed.data

  const agent = await createAgent({
    workspaceId: ctx.workspaceId,
    templateId: templateId || null,
    name,
    emoji,
    role,
    soul,
    provider,
    model,
    apiKeyEncrypted: encrypt(apiKey),
    baseUrl: baseUrl || null,
    seniority: seniority ?? 50,
    useWebSearch: useWebSearch ?? false,
    trustedUrls: trustedUrls ? JSON.stringify(trustedUrls) : null,
    mcpEndpoint: mcpEndpoint || null,
    mcpAccessMode: mcpAccessMode || null,
  })

  const { apiKeyEncrypted, ...publicAgent } = agent
  logAudit({
    workspaceId: ctx.workspaceId, userId: ctx.userId,
    action: "agent.create", resource: "agent", resourceId: agent.id,
    details: { name: agent.name },
  })
  return NextResponse.json(
    { data: { ...publicAgent, hasApiKey: true } },
    { status: 201 }
  )
}

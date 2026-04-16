import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import { getAgentById } from "@/lib/db/queries/agents"
import { getKnowledgeByAgent } from "@/lib/db/queries/agent-knowledge"

// GET /api/agents/[id]/knowledge — List knowledge files
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

  const knowledge = await getKnowledgeByAgent(id, ctx.workspaceId)

  const data = knowledge.map((k) => ({
    id: k.id,
    filename: k.filename,
    mimeType: k.mimeType,
    meta: k.meta,
    tokens: k.tokens,
    uploadedAt: k.uploadedAt,
    preview: k.content.slice(0, 200),
  }))

  return NextResponse.json({ data })
}

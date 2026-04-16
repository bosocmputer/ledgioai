import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import { getAgentById } from "@/lib/db/queries/agents"
import { deleteKnowledge } from "@/lib/db/queries/agent-knowledge"

// DELETE /api/agents/[id]/knowledge/[knowledgeId] — Delete knowledge entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; knowledgeId: string }> }
) {
  const { id, knowledgeId } = await params
  const ctx = await requirePermission(request, "agent:update")
  if (ctx instanceof Response) return ctx

  const agent = await getAgentById(id, ctx.workspaceId)
  if (!agent) {
    return NextResponse.json({ error: "Agent ไม่พบ" }, { status: 404 })
  }

  const deleted = await deleteKnowledge(knowledgeId, ctx.workspaceId)
  if (!deleted) {
    return NextResponse.json({ error: "Knowledge ไม่พบ" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import { getAgentById } from "@/lib/db/queries/agents"
import { createKnowledge } from "@/lib/db/queries/agent-knowledge"
import { parseDocument, isAllowedMimeType } from "@/lib/documents/parser"

// POST /api/agents/[id]/knowledge/upload — Upload knowledge file
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await requirePermission(request, "agent:update")
  if (ctx instanceof Response) return ctx

  const agent = await getAgentById(id, ctx.workspaceId)
  if (!agent) {
    return NextResponse.json({ error: "Agent ไม่พบ" }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "กรุณาแนบไฟล์" }, { status: 400 })
  }

  if (!isAllowedMimeType(file.type)) {
    return NextResponse.json(
      { error: "ไม่รองรับไฟล์ประเภทนี้ (รองรับ: PDF, Excel, Word, CSV, JSON, TXT, MD)" },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = await parseDocument(buffer, file.name, file.type)

  const knowledge = await createKnowledge({
    agentId: id,
    workspaceId: ctx.workspaceId,
    filename: file.name,
    mimeType: file.type,
    meta: parsed.meta,
    content: parsed.content,
    tokens: parsed.tokens,
  })

  return NextResponse.json(
    {
      data: {
        id: knowledge.id,
        filename: knowledge.filename,
        mimeType: knowledge.mimeType,
        meta: knowledge.meta,
        tokens: knowledge.tokens,
        uploadedAt: knowledge.uploadedAt,
        preview: knowledge.content.slice(0, 200),
      },
    },
    { status: 201 }
  )
}

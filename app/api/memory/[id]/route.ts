import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import {
  getMemoryFactById,
  updateMemoryFact,
  deleteMemoryFact,
} from "@/lib/db/queries/memory"
import { updateMemorySchema, parseBody } from "@/lib/validations"

// GET /api/memory/[id] — Get single fact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePermission(request, "memory:read")
  if (ctx instanceof Response) return ctx

  const { id } = await params

  const fact = await getMemoryFactById(id, ctx.workspaceId)
  if (!fact) {
    return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 })
  }

  return NextResponse.json({ data: fact })
}

// PATCH /api/memory/[id] — Update a fact
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePermission(request, "memory:update")
  if (ctx instanceof Response) return ctx

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Request body is required" }, { status: 400 })
  }
  const parsed = parseBody(updateMemorySchema, body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { value, category, confidence } = parsed.data

  const fact = await updateMemoryFact(id, ctx.workspaceId, {
    ...(value !== undefined && { value }),
    ...(category !== undefined && { category }),
    ...(confidence !== undefined && { confidence }),
  })

  if (!fact) {
    return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 })
  }

  return NextResponse.json({ data: fact })
}

// DELETE /api/memory/[id] — Delete a fact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePermission(request, "memory:delete")
  if (ctx instanceof Response) return ctx

  const { id } = await params

  const deleted = await deleteMemoryFact(id, ctx.workspaceId)
  if (!deleted) {
    return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 })
  }

  return NextResponse.json({ data: deleted })
}

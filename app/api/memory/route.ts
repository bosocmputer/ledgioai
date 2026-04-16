import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import {
  getMemoryFactsByWorkspace,
  countMemoryFacts,
  getMemoryCategories,
  createMemoryFact,
  deleteAllMemoryFacts,
} from "@/lib/db/queries/memory"
import { createMemorySchema, parseBody } from "@/lib/validations"
import { rateLimitByUser } from "@/lib/rate-limit"

// GET /api/memory — List memory facts (with filtering + search)
export async function GET(request: NextRequest) {
  const ctx = await requirePermission(request, "memory:read")
  if (ctx instanceof Response) return ctx

  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category") ?? undefined
  const search = searchParams.get("search") ?? undefined
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500)
  const offset = parseInt(searchParams.get("offset") ?? "0")

  const [facts, total, categories] = await Promise.all([
    getMemoryFactsByWorkspace(ctx.workspaceId, { category, search, limit, offset }),
    countMemoryFacts(ctx.workspaceId, category),
    getMemoryCategories(ctx.workspaceId),
  ])

  return NextResponse.json({ data: facts, total, categories })
}

// POST /api/memory — Create a memory fact manually
export async function POST(request: NextRequest) {
  const ctx = await requirePermission(request, "memory:update")
  if (ctx instanceof Response) return ctx

  const rl = await rateLimitByUser(ctx.userId, "mutation")
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Request body is required" }, { status: 400 })
  }
  const parsed = parseBody(createMemorySchema, body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { key, value, category, confidence } = parsed.data

  const fact = await createMemoryFact({
    workspaceId: ctx.workspaceId,
    key,
    value,
    category: category || "other",
    source: "manual",
    confidence: confidence ?? 100,
  })

  return NextResponse.json({ data: fact }, { status: 201 })
}

// DELETE /api/memory — Delete all memory facts
export async function DELETE(request: NextRequest) {
  const ctx = await requirePermission(request, "memory:delete")
  if (ctx instanceof Response) return ctx

  const count = await deleteAllMemoryFacts(ctx.workspaceId)

  return NextResponse.json({ deleted: count })
}

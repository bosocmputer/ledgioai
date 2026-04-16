import { requireAuth } from "@/lib/auth/helpers"
import { db } from "@/lib/db"
import { meetings } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

// PATCH /api/meetings/[id]/tags — Update tags
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await requireAuth(request)
  if (ctx instanceof Response) return ctx
  const workspaceId = ctx.workspaceId

  const body = await request.json().catch(() => null)
  const tags = body?.tags

  if (!Array.isArray(tags)) {
    return Response.json({ error: "tags must be an array" }, { status: 400 })
  }

  // Sanitize tags
  const cleanTags = tags
    .filter((t: unknown) => typeof t === "string" && t.trim().length > 0)
    .map((t: string) => t.trim().slice(0, 50))
    .slice(0, 20)

  const result = await db
    .update(meetings)
    .set({ tags: JSON.stringify(cleanTags) })
    .where(and(eq(meetings.id, id), eq(meetings.workspaceId, workspaceId)))
    .returning({ id: meetings.id })

  if (result.length === 0) {
    return Response.json({ error: "ไม่พบการประชุม" }, { status: 404 })
  }

  return Response.json({ data: { tags: cleanTags } })
}

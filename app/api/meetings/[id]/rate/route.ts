import { requireAuth } from "@/lib/auth/helpers"
import { db } from "@/lib/db"
import { meetings } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await requireAuth(request)
  if (ctx instanceof Response) return ctx
  const workspaceId = ctx.workspaceId

  const body = await request.json().catch(() => null)
  const rating = body?.rating
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    return Response.json({ error: "Rating ต้องเป็น 1-5" }, { status: 400 })
  }

  const result = await db
    .update(meetings)
    .set({ rating })
    .where(and(eq(meetings.id, id), eq(meetings.workspaceId, workspaceId)))
    .returning({ id: meetings.id })

  if (result.length === 0) {
    return Response.json({ error: "ไม่พบการประชุม" }, { status: 404 })
  }

  return Response.json({ data: { rating } })
}

import { requireAuth } from "@/lib/auth/helpers"
import { db } from "@/lib/db"
import { meetings } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { randomBytes } from "crypto"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await requireAuth(request)
  if (ctx instanceof Response) return ctx
  const workspaceId = ctx.workspaceId

  // Check meeting exists and belongs to workspace
  const [meeting] = await db
    .select({ id: meetings.id, shareToken: meetings.shareToken })
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.workspaceId, workspaceId)))
    .limit(1)

  if (!meeting) {
    return Response.json({ error: "ไม่พบการประชุม" }, { status: 404 })
  }

  // Return existing token or generate new one
  let token = meeting.shareToken
  if (!token) {
    token = randomBytes(24).toString("base64url")
    await db.update(meetings).set({ shareToken: token }).where(eq(meetings.id, id))
  }

  return Response.json({ data: { token } })
}

import { requireAuth } from "@/lib/auth/helpers"
import { db } from "@/lib/db"
import { scheduledMeetings } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"

export async function GET(request: Request) {
  const ctx = await requireAuth(request)
  if (ctx instanceof Response) return ctx
  const workspaceId = ctx.workspaceId

  const schedules = await db
    .select()
    .from(scheduledMeetings)
    .where(eq(scheduledMeetings.workspaceId, workspaceId))
    .orderBy(desc(scheduledMeetings.scheduledAt))

  return Response.json({ data: schedules })
}

export async function POST(request: Request) {
  const ctx = await requireAuth(request)
  if (ctx instanceof Response) return ctx
  const workspaceId = ctx.workspaceId
  const userId = ctx.userId

  const body = await request.json()
  const { question, mode, agentIds, teamId, scheduledAt, cronExpr } = body

  if (!question || !scheduledAt) {
    return Response.json({ error: "question and scheduledAt are required" }, { status: 400 })
  }

  const scheduled = new Date(scheduledAt)
  if (scheduled <= new Date()) {
    return Response.json({ error: "scheduledAt must be in the future" }, { status: 400 })
  }

  const [result] = await db
    .insert(scheduledMeetings)
    .values({
      workspaceId,
      userId,
      question,
      mode: mode ?? "full_board",
      agentIds: JSON.stringify(agentIds ?? []),
      teamId: teamId ?? null,
      scheduledAt: scheduled,
      cronExpr: cronExpr ?? null,
    })
    .returning()

  return Response.json({ data: result }, { status: 201 })
}

export async function DELETE(request: Request) {
  const ctx = await requireAuth(request)
  if (ctx instanceof Response) return ctx
  const workspaceId = ctx.workspaceId

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return Response.json({ error: "id is required" }, { status: 400 })

  await db
    .update(scheduledMeetings)
    .set({ isActive: false })
    .where(and(eq(scheduledMeetings.id, id), eq(scheduledMeetings.workspaceId, workspaceId)))

  return Response.json({ data: { deactivated: true } })
}

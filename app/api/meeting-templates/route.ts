import { requireAuth } from "@/lib/auth/helpers"
import { db } from "@/lib/db"
import { meetingTemplates } from "@/lib/db/schema"
import { eq, or, isNull, desc } from "drizzle-orm"

export async function GET(request: Request) {
  const ctx = await requireAuth(request)
  if (ctx instanceof Response) return ctx
  const workspaceId = ctx.workspaceId

  // Get system + workspace-specific templates
  const templates = await db
    .select()
    .from(meetingTemplates)
    .where(or(isNull(meetingTemplates.workspaceId), eq(meetingTemplates.workspaceId, workspaceId)))
    .orderBy(desc(meetingTemplates.createdAt))

  return Response.json({ data: templates })
}

export async function POST(request: Request) {
  const ctx = await requireAuth(request)
  if (ctx instanceof Response) return ctx
  const workspaceId = ctx.workspaceId

  const body = await request.json()
  const { name, emoji, description, question, mode, category, suggestedAgentRoles } = body

  if (!name || !question) {
    return Response.json({ error: "name and question are required" }, { status: 400 })
  }

  const [template] = await db
    .insert(meetingTemplates)
    .values({
      workspaceId,
      name,
      emoji: emoji ?? "📋",
      description: description ?? null,
      question,
      mode: mode ?? "full_board",
      category: category ?? null,
      suggestedAgentRoles: suggestedAgentRoles ? JSON.stringify(suggestedAgentRoles) : null,
    })
    .returning()

  return Response.json({ data: template }, { status: 201 })
}

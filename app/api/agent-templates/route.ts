import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import { getTemplates } from "@/lib/db/queries/agent-templates"

// GET /api/agent-templates — List templates (system + workspace)
export async function GET(request: NextRequest) {
  const ctx = await requirePermission(request, "agent:read")
  if (ctx instanceof Response) return ctx

  const templates = await getTemplates(ctx.workspaceId)

  return NextResponse.json({ data: templates })
}

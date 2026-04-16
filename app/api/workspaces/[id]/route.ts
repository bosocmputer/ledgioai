import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getWorkspaceById, getUserWorkspaceRole } from "@/lib/db/queries/workspaces"
import { getWorkspaceSettings, upsertWorkspaceSettings } from "@/lib/db/queries/settings"
import { updateWorkspaceSettingsSchema, parseBody } from "@/lib/validations"

// GET /api/workspaces/[id] — Get workspace detail + settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = await getUserWorkspaceRole(session.user.id, id)
  if (!role) {
    return NextResponse.json({ error: "Workspace ไม่พบ" }, { status: 404 })
  }

  const workspace = await getWorkspaceById(id)
  if (!workspace) {
    return NextResponse.json({ error: "Workspace ไม่พบ" }, { status: 404 })
  }

  const settings = await getWorkspaceSettings(id)

  return NextResponse.json({
    data: {
      ...workspace,
      role,
      settings: settings
        ? {
            defaultProvider: settings.defaultProvider,
            defaultModel: settings.defaultModel,
            maxTokensPerMeeting: settings.maxTokensPerMeeting,
            maxMeetingsPerDay: settings.maxMeetingsPerDay,
            enableWebSearch: settings.enableWebSearch,
            enableMcp: settings.enableMcp,
            hasSerperKey: !!settings.serperApiKeyEncrypted,
            hasSerpKey: !!settings.serpApiKeyEncrypted,
          }
        : null,
    },
  })
}

// PUT /api/workspaces/[id] — Update workspace settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = await getUserWorkspaceRole(session.user.id, id)
  if (!role || !["owner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Request body is required" }, { status: 400 })
  }
  const parsed = parseBody(updateWorkspaceSettingsSchema, body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { settings } = parsed.data
  await upsertWorkspaceSettings(id, settings)

  return NextResponse.json({ ok: true })
}

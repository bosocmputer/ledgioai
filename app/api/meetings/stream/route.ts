import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth/permissions"
import { createSSEStream } from "@/lib/meeting/sse"
import { runMeeting, type MeetingMode } from "@/lib/meeting/engine"
import { getAgentById } from "@/lib/db/queries/agents"
import { getTeamById } from "@/lib/db/queries/teams"
import { parseDocument, isAllowedMimeType } from "@/lib/documents/parser"
import { logger } from "@/lib/logger"
import { startMeetingSchema, parseBody } from "@/lib/validations"
import { rateLimitByUser } from "@/lib/rate-limit"
import { logAudit } from "@/lib/db/queries/audit"
import { getWorkspaceSettings } from "@/lib/db/queries/settings"
import { getTodayUsageByWorkspace } from "@/lib/db/queries/stats"
import type { FileContext } from "@/lib/meeting/context"
import type { ClarificationAnswer } from "@/lib/meeting/modes/full-board"

// POST /api/meetings/stream — Start a meeting (SSE)
export async function POST(request: NextRequest) {
  const ctx = await requirePermission(request, "meeting:start")
  if (ctx instanceof Response) return ctx

  const rl = await rateLimitByUser(ctx.userId, "meeting")
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  // ── Quota Check ──────────────────────────────────────
  const [settings, todayUsage] = await Promise.all([
    getWorkspaceSettings(ctx.workspaceId),
    getTodayUsageByWorkspace(ctx.workspaceId),
  ])

  const maxMeetingsPerDay = settings?.maxMeetingsPerDay ?? 100
  if (todayUsage.totalMeetings >= maxMeetingsPerDay) {
    return NextResponse.json(
      { error: `เกินจำนวน meeting สูงสุดวันนี้ (${maxMeetingsPerDay} meetings/วัน)` },
      { status: 429 },
    )
  }

  // Parse multipart/form-data or JSON
  let question: string
  let mode: MeetingMode
  let agentIds: string[]
  let teamId: string | undefined
  let clarificationAnswers: ClarificationAnswer[] | undefined
  let fileContexts: FileContext[] = []

  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    question = formData.get("question") as string
    mode = (formData.get("mode") as MeetingMode) ?? "quick_ask"
    agentIds = JSON.parse((formData.get("agentIds") as string) ?? "[]")
    teamId = (formData.get("teamId") as string) || undefined
    const clarAnswers = formData.get("clarificationAnswers") as string
    if (clarAnswers) clarificationAnswers = JSON.parse(clarAnswers)

    // Parse uploaded files
    const files = formData.getAll("files") as File[]
    for (const file of files) {
      if (!isAllowedMimeType(file.type)) continue
      const buffer = Buffer.from(await file.arrayBuffer())
      const parsed = await parseDocument(buffer, file.name, file.type)
      fileContexts.push({
        filename: file.name,
        content: parsed.content,
        tokens: parsed.tokens,
      })
    }
  } else {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: "Request body is required" }, { status: 400 })
    }
    const parsed = parseBody(startMeetingSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    question = parsed.data.question
    mode = parsed.data.mode as MeetingMode
    agentIds = parsed.data.agentIds
    teamId = parsed.data.teamId
    clarificationAnswers = parsed.data.clarificationAnswers as ClarificationAnswer[] | undefined
  }

  // Validate
  if (!question?.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 })
  }

  // Load agents
  let agentRows: Awaited<ReturnType<typeof getAgentById>>[] = []

  if (teamId) {
    // Load team and its agents
    const team = await getTeamById(teamId, ctx.workspaceId)
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }
    agentRows = team.agents ?? []
  } else if (agentIds.length > 0) {
    // Load individual agents
    const loaded = await Promise.all(
      agentIds.map((id) => getAgentById(id, ctx.workspaceId)),
    )
    agentRows = loaded.filter(Boolean)
  }

  if (agentRows.length === 0) {
    return NextResponse.json({ error: "No agents found" }, { status: 400 })
  }

  // Validate mode vs agent count
  if (mode === "quick_ask" && agentRows.length > 1) {
    // Quick Ask uses only the first agent
    agentRows = [agentRows[0]]
  }
  if ((mode === "consult" || mode === "full_board") && agentRows.length < 2) {
    return NextResponse.json(
      { error: `${mode} requires at least 2 agents` },
      { status: 400 },
    )
  }

  // Start SSE stream
  logger.info(
    { workspaceId: ctx.workspaceId, userId: ctx.userId, mode, agentCount: agentRows.length, teamId },
    "Meeting started"
  )
  logAudit({
    workspaceId: ctx.workspaceId, userId: ctx.userId,
    action: "meeting.start", resource: "meeting",
    details: { mode, agentCount: agentRows.length, teamId },
  })

  return createSSEStream(async (send) => {
    await runMeeting(
      {
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        question: question.trim(),
        mode,
        agentRows: agentRows as NonNullable<typeof agentRows[number]>[],
        teamId,
        fileContexts,
        clarificationAnswers,
        maxTokensPerMeeting: settings?.maxTokensPerMeeting ?? 50_000,
      },
      send,
    )
  })
}

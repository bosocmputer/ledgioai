import { requireAuth } from "@/lib/auth/helpers"
import { getMeetingById, getMessagesByMeeting } from "@/lib/db/queries/meetings"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await requireAuth(request)
  if (ctx instanceof Response) return ctx
  const workspaceId = ctx.workspaceId

  const meeting = await getMeetingById(id, workspaceId)
  if (!meeting) {
    return Response.json({ error: "ไม่พบการประชุม" }, { status: 404 })
  }

  const meetingMessages = await getMessagesByMeeting(id, workspaceId)

  // Build HTML report
  const modeLabel: Record<string, string> = {
    quick_ask: "Quick Ask",
    consult: "Consult",
    full_board: "Full Board",
  }

  const phaseLabel: Record<string, string> = {
    quick_answer: "💬 คำตอบ",
    analysis: "🔍 วิเคราะห์",
    finding: "📋 นำเสนอ",
    discussion: "💬 ถกเถียง",
    synthesis: "📝 สรุปมติ",
    clarification: "❓ ถามเพิ่มเติม",
    system: "⚙️ ระบบ",
  }

  const messages = meetingMessages as Array<{
    agentName: string
    agentEmoji: string
    phase: string
    content: string
    tokensUsed: number
  }>

  const startDate = meeting.startedAt
    ? new Date(meeting.startedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
    : "-"

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>LEDGIO AI — รายงานการประชุม</title>
<style>
  @page { margin: 2cm; size: A4; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
  .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
  .meta { color: #6b7280; font-size: 14px; margin-top: 8px; }
  .meta span { margin-right: 16px; }
  .question { background: #f0f7ff; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px; }
  .question h2 { margin: 0 0 4px; font-size: 14px; color: #6b7280; }
  .question p { margin: 0; font-size: 16px; font-weight: 500; }
  .message { margin-bottom: 24px; page-break-inside: avoid; }
  .msg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .agent-name { font-weight: 600; font-size: 14px; }
  .phase-tag { background: #f3f4f6; padding: 2px 10px; border-radius: 12px; font-size: 12px; color: #6b7280; }
  .msg-content { font-size: 14px; color: #374151; white-space: pre-wrap; }
  .final-answer { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-top: 30px; }
  .final-answer h3 { margin: 0 0 12px; color: #1e40af; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; text-align: center; }
  .tokens { color: #9ca3af; font-size: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">📋 LEDGIO AI — รายงานการประชุม</div>
    <div class="meta">
      <span>โหมด: ${modeLabel[meeting.mode] ?? meeting.mode}</span>
      <span>วันที่: ${startDate}</span>
      <span>สถานะ: ${meeting.status}</span>
      ${meeting.totalTokens ? `<span>Tokens: ${meeting.totalTokens.toLocaleString()}</span>` : ""}
    </div>
  </div>

  <div class="question">
    <h2>คำถาม</h2>
    <p>${escapeHtml(meeting.question)}</p>
  </div>

  <h2 style="font-size:18px; margin-bottom:16px;">การอภิปราย</h2>

  ${messages
    .map(
      (msg) => `
  <div class="message">
    <div class="msg-header">
      <span>${msg.agentEmoji}</span>
      <span class="agent-name">${escapeHtml(msg.agentName)}</span>
      ${msg.phase ? `<span class="phase-tag">${phaseLabel[msg.phase] ?? msg.phase}</span>` : ""}
      ${msg.tokensUsed ? `<span class="tokens">${msg.tokensUsed} tokens</span>` : ""}
    </div>
    <div class="msg-content">${escapeHtml(msg.content)}</div>
  </div>`
    )
    .join("\n")}

  ${
    meeting.finalAnswer
      ? `
  <div class="final-answer">
    <h3>📝 สรุปมติการประชุม</h3>
    <div class="msg-content">${escapeHtml(meeting.finalAnswer)}</div>
  </div>`
      : ""
  }

  <div class="footer">
    สร้างโดย LEDGIO AI — AI Expert Team Builder<br>
    Meeting ID: ${meeting.id}
  </div>
</body>
</html>`

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="ledgio-meeting-${id.slice(0, 8)}.html"`,
    },
  })
}

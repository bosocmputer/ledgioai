import { db } from "@/lib/db"
import { meetings, meetingMessages } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"

async function getMeetingByShareToken(token: string) {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.shareToken, token))
    .limit(1)
  if (!meeting) return null

  const msgs = await db
    .select()
    .from(meetingMessages)
    .where(eq(meetingMessages.meetingId, meeting.id))
    .orderBy(asc(meetingMessages.timestamp))

  return { ...meeting, messages: msgs }
}

const phaseLabels: Record<string, string> = {
  quick_answer: "💬 คำตอบ",
  analysis: "🔍 วิเคราะห์",
  finding: "📋 นำเสนอ",
  discussion: "💬 ถกเถียง",
  synthesis: "📝 สรุปมติ",
  clarification: "❓ ถามเพิ่มเติม",
  system: "⚙️ ระบบ",
}

export default async function SharedMeetingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const meeting = await getMeetingByShareToken(token)

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">ไม่พบการประชุม</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">ลิงก์นี้อาจหมดอายุหรือถูกลบแล้ว</p>
        </div>
      </div>
    )
  }

  const modeLabel: Record<string, string> = {
    quick_ask: "Quick Ask",
    consult: "Consult",
    full_board: "Full Board",
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">L</div>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">LEDGIO AI</span>
            <span className="text-xs text-gray-400 ml-2">Shared Meeting</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{meeting.question}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-xs">
              {modeLabel[meeting.mode] ?? meeting.mode}
            </span>
            <span>{meeting.startedAt ? new Date(meeting.startedAt).toLocaleString("th-TH") : ""}</span>
            {meeting.totalTokens > 0 && <span>{meeting.totalTokens.toLocaleString()} tokens</span>}
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-4">
          {meeting.messages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl">
                {msg.agentEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{msg.agentName}</span>
                  {msg.phase && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                      {phaseLabels[msg.phase] ?? msg.phase}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Final Answer */}
        {meeting.finalAnswer && (
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">📝 สรุปมติการประชุม</h3>
            <div className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">{meeting.finalAnswer}</div>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-gray-400">
          สร้างโดย LEDGIO AI — AI Expert Team Builder
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Bot, Download, Share2, Star } from "lucide-react"
import { useWorkspace } from "@/components/providers/workspace-provider"

interface MeetingMessage {
  id: string
  agentId: string
  agentName: string
  agentEmoji: string
  phase: string
  content: string
  tokensUsed: number
  timestamp: string
}

interface MeetingDetail {
  id: string
  question: string
  mode: string
  status: string
  finalAnswer: string | null
  totalTokens: number
  startedAt: string
  completedAt: string | null
  messages: MeetingMessage[]
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

export default function MeetingDetailPage() {
  const { activeWorkspace } = useWorkspace()
  const params = useParams()
  const id = params.id as string
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [rating, setRating] = useState<number>(0)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)

  useEffect(() => {
    if (!activeWorkspace || !id) return
    fetch(`/api/meetings/${id}`)
      .then((r) => r.json())
      .then((json) => setMeeting(json.data ?? null))
      .finally(() => setLoading(false))
  }, [activeWorkspace, id])

  if (loading) {
    return <div className="p-6 text-center text-gray-400">กำลังโหลด...</div>
  }

  if (!meeting) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">ไม่พบการประชุมนี้</p>
        <Link href="/history" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          กลับไปประวัติ
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/history" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 mb-3">
          <ArrowLeft className="w-4 h-4" /> กลับไปประวัติ
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{meeting.question}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                {meeting.mode.replace("_", " ")}
              </span>
              <span>{new Date(meeting.startedAt).toLocaleString("th-TH")}</span>
              {meeting.totalTokens > 0 && (
                <span>{meeting.totalTokens.toLocaleString()} tokens</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Download Report */}
            <button
              onClick={() => window.open(`/api/meetings/${id}/report`, "_blank")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="ดาวน์โหลดรายงาน"
            >
              <Download className="w-4 h-4" />
              รายงาน
            </button>
            {/* Share */}
            <button
              onClick={async () => {
                setSharing(true)
                try {
                  const res = await fetch(`/api/meetings/${id}/share`, { method: "POST" })
                  if (res.ok) {
                    const json = await res.json()
                    const url = `${window.location.origin}/share/${json.data.token}`
                    setShareUrl(url)
                    await navigator.clipboard.writeText(url)
                  }
                } finally {
                  setSharing(false)
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="แชร์ลิงก์"
            >
              <Share2 className="w-4 h-4" />
              {shareUrl ? "คัดลอกแล้ว!" : sharing ? "..." : "แชร์"}
            </button>
          </div>
        </div>
        {/* Rating */}
        {meeting.status === "completed" && !ratingSubmitted && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">ให้คะแนน:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={async () => {
                  setRating(star)
                  setRatingSubmitted(true)
                  await fetch(`/api/meetings/${id}/rate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rating: star }),
                  })
                }}
                className={`p-0.5 transition-colors ${star <= rating ? "text-amber-400" : "text-gray-300 hover:text-amber-300"}`}
              >
                <Star className={`w-5 h-5 ${star <= rating ? "fill-amber-400" : ""}`} />
              </button>
            ))}
            {ratingSubmitted && <span className="text-xs text-green-600">ขอบคุณ!</span>}
          </div>
        )}
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
                <span className="font-medium text-sm">{msg.agentName}</span>
                {msg.phase && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                    {phaseLabels[msg.phase] ?? msg.phase}
                  </span>
                )}
                {msg.tokensUsed > 0 && (
                  <span className="text-xs text-gray-400">{msg.tokensUsed} tokens</span>
                )}
              </div>
              <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {meeting.messages.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Bot className="w-12 h-12 mx-auto mb-2" />
            <p>ไม่มีข้อความในการประชุมนี้</p>
          </div>
        )}
      </div>

      {/* Final Answer */}
      {meeting.finalAnswer && (
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">📝 สรุปมติการประชุม</h3>
          <div className="prose prose-sm max-w-none text-blue-900 whitespace-pre-wrap">
            {meeting.finalAnswer}
          </div>
        </div>
      )}
    </div>
  )
}

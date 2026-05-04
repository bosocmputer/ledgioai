"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Clock, MessageCircle, Users, Building2 } from "lucide-react"
import { useWorkspace } from "@/components/providers/workspace-provider"
import { PageInfo } from "@/components/ui/page-info"
import { Badge } from "@/components/ui/badge"
import { ButtonLink } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { MetricCard } from "@/components/ui/metric-card"
import { PageHeader } from "@/components/ui/page-header"
import { SearchInput } from "@/components/ui/search-input"

interface Meeting {
  id: string
  question: string
  mode: "quick_ask" | "consult" | "full_board"
  status: "running" | "completed" | "error" | "cancelled"
  totalTokens: number
  startedAt: string
  completedAt: string | null
  agentIds: string
}

interface Stats {
  total: number
  totalTokens: number
}

const modeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  quick_ask: { label: "Quick Ask", icon: <MessageCircle className="w-4 h-4" />, color: "bg-green-100 text-green-700 dark:text-green-300" },
  consult: { label: "Consult", icon: <Users className="w-4 h-4" />, color: "bg-blue-100 text-blue-700 dark:text-blue-300" },
  full_board: { label: "Full Board", icon: <Building2 className="w-4 h-4" />, color: "bg-purple-100 text-purple-700" },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  running: { label: "กำลังทำงาน", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "เสร็จสิ้น", color: "bg-green-100 text-green-700 dark:text-green-300" },
  error: { label: "ผิดพลาด", color: "bg-red-100 text-red-700 dark:text-red-300" },
  cancelled: { label: "ยกเลิก", color: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" },
}

export default function HistoryPage() {
  const { activeWorkspace } = useWorkspace()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, totalTokens: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchDebounce, setSearchDebounce] = useState("")

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchDebounce), 300)
    return () => clearTimeout(timer)
  }, [searchDebounce])

  const fetchHistory = useCallback(async () => {
    if (!activeWorkspace) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      const qs = params.toString()
      const res = await fetch(`/api/meetings${qs ? `?${qs}` : ""}`)
      if (!res.ok) {
        setMeetings([])
        setStats({ total: 0, totalTokens: 0 })
        return
      }
      const json = await res.json()
      setMeetings(json.data ?? [])
      setStats(json.stats ?? { total: 0, totalTokens: 0 })
    } finally {
      setLoading(false)
    }
  }, [activeWorkspace, search])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "เมื่อสักครู่"
    if (mins < 60) return `${mins} นาทีที่แล้ว`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} ชม.ที่แล้ว`
    const days = Math.floor(hours / 24)
    return `${days} วันที่แล้ว`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ประวัติประชุม"
        description="บันทึกคำถาม สรุปมติ transcript และ token usage ของเวิร์กสเปซนี้"
      />

      <PageInfo id="history">
        ทุกการประชุมถูกบันทึกไว้ที่นี่ — กดเข้าไปดูการสนทนาทั้งหมด สรุปมติ และจำนวน token ที่ใช้ในแต่ละครั้ง ใช้เป็นข้อมูลอ้างอิงเมื่อลูกค้าถามซ้ำถึงคำแนะนำเดิม หรือต้องการตรวจสอบว่า agent ตอบอะไรไปบ้าง
      </PageInfo>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="การประชุมทั้งหมด" value={stats.total} />
        <MetricCard label="Tokens ใช้ทั้งหมด" value={stats.totalTokens.toLocaleString()} />
      </div>

      <SearchInput
        className="max-w-md"
        value={searchDebounce}
        onChange={(e) => setSearchDebounce(e.target.value)}
        onClear={() => setSearchDebounce("")}
        placeholder="ค้นหาคำถาม..."
      />

      {/* Meeting List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-1/4 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-12 w-12" />}
          title={search ? "ไม่พบประวัติที่ค้นหา" : "ยังไม่มีประวัติการประชุม"}
          description={search ? "ลองค้นหาด้วยคำถามอื่น" : "เริ่มประชุมแรกเพื่อให้ระบบบันทึก transcript และสรุปมติ"}
          action={!search ? <ButtonLink href="/meeting">เริ่มประชุม</ButtonLink> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => {
            const mode = modeConfig[meeting.mode]
            const status = statusConfig[meeting.status]
            const agentCount = JSON.parse(meeting.agentIds || "[]").length

            return (
              <Link
                key={meeting.id}
                href={`/history/${meeting.id}`}
                className="block bg-white dark:bg-gray-900 rounded-lg border p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{meeting.question}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${mode.color}`}>
                        {mode.icon} {mode.label}
                      </span>
                      <Badge tone={meeting.status === "completed" ? "green" : meeting.status === "error" ? "red" : meeting.status === "running" ? "amber" : "gray"}>
                        {status.label}
                      </Badge>
                      <span className="text-xs text-gray-400">{agentCount} คน</span>
                      {meeting.totalTokens > 0 && (
                        <span className="text-xs text-gray-400">
                          {meeting.totalTokens.toLocaleString()} tokens
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 ml-4 flex-shrink-0">
                    {timeAgo(meeting.startedAt)}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

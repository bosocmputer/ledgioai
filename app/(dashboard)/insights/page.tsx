"use client"

import { useEffect, useState } from "react"
import { BarChart3, TrendingUp, Star, Zap, Users, MessageSquare } from "lucide-react"

interface InsightData {
  meetingsByDay: { day: string; count: number }[]
  meetingsByMode: { mode: string; count: number }[]
  avgRating: { avg_rating: number | null; rated_count: number }
  tokensByDay: { day: string; tokens: number }[]
  topQuestions: { question: string; mode: string }[]
  agentCount: number
}

export default function InsightDashboardPage() {
  const [data, setData] = useState<InsightData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/stats/insights")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((json) => setData(json.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold dark:text-gray-100">📊 Insight Dashboard</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 h-28" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return <div className="text-gray-500">Failed to load insights</div>

  const totalMeetings = data.meetingsByDay.reduce((s, d) => s + d.count, 0)
  const totalTokens = data.tokensByDay.reduce((s, d) => s + d.tokens, 0)
  const maxMeetingsPerDay = Math.max(...data.meetingsByDay.map((d) => d.count), 1)
  const maxTokensPerDay = Math.max(...data.tokensByDay.map((d) => d.tokens), 1)

  const modeLabel: Record<string, string> = {
    quick_ask: "⚡ Quick Ask",
    consult: "🤝 Consult",
    full_board: "🏛️ Full Board",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">📊 Insight Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          สรุปข้อมูลการใช้งาน 30 วันล่าสุด
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">ประชุมทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalMeetings}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950">
              <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tokens ใช้ไป</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalTokens.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Agents</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.agentCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950">
              <Star className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">คะแนนเฉลี่ย</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.avgRating.avg_rating ? data.avgRating.avg_rating.toFixed(1) : "–"}
                <span className="text-sm font-normal text-gray-400 ml-1">
                  ({data.avgRating.rated_count} รีวิว)
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Meetings per day bar chart */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> ประชุมรายวัน
          </h3>
          <div className="flex items-end gap-1 h-40">
            {data.meetingsByDay.slice(-14).map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-400">{d.count}</span>
                <div
                  className="w-full bg-blue-500 dark:bg-blue-600 rounded-t"
                  style={{ height: `${(d.count / maxMeetingsPerDay) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
                />
                <span className="text-[10px] text-gray-400 -rotate-45">
                  {new Date(d.day).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tokens per day */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Token ใช้รายวัน
          </h3>
          <div className="flex items-end gap-1 h-40">
            {data.tokensByDay.slice(-14).map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-400">{d.tokens > 1000 ? `${(d.tokens/1000).toFixed(0)}k` : d.tokens}</span>
                <div
                  className="w-full bg-amber-500 dark:bg-amber-600 rounded-t"
                  style={{ height: `${(d.tokens / maxTokensPerDay) * 100}%`, minHeight: d.tokens > 0 ? 4 : 0 }}
                />
                <span className="text-[10px] text-gray-400 -rotate-45">
                  {new Date(d.day).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mode Distribution */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">โหมดการประชุม</h3>
          <div className="space-y-3">
            {data.meetingsByMode.map((m) => {
              const pct = totalMeetings > 0 ? (m.count / totalMeetings) * 100 : 0
              return (
                <div key={m.mode}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{modeLabel[m.mode] ?? m.mode}</span>
                    <span className="text-gray-500">{m.count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Questions */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">คำถามล่าสุด</h3>
          <div className="space-y-2">
            {data.topQuestions.map((q, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-gray-400 flex-shrink-0">{i + 1}.</span>
                <span className="text-gray-700 dark:text-gray-300 line-clamp-1 flex-1">{q.question}</span>
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded flex-shrink-0">
                  {q.mode.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

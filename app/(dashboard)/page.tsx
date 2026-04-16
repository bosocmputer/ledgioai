"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Bot, Users, MessageSquare, Brain,
  Zap, Clock, TrendingUp, ArrowRight,
} from "lucide-react"
import { useWorkspace } from "@/components/providers/workspace-provider"

interface Overview {
  agents: number
  teams: number
  meetings: number
  totalTokens: number
  memoryFacts: number
}

interface RecentMeeting {
  id: string
  question: string
  mode: string
  status: string
  totalTokens: number
  startedAt: string
}

interface ModeCount {
  mode: string
  count: number
}

const modeConfig: Record<string, { label: string; emoji: string }> = {
  quick_ask: { label: "Quick Ask", emoji: "⚡" },
  consult: { label: "Consult", emoji: "🤝" },
  full_board: { label: "Full Board", emoji: "🏛️" },
}

const statusColors: Record<string, string> = {
  running: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700 dark:text-green-300",
  error: "bg-red-100 text-red-700 dark:text-red-300",
  cancelled: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
}

export default function DashboardPage() {
  const { activeWorkspace } = useWorkspace()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [recentMeetings, setRecentMeetings] = useState<RecentMeeting[]>([])
  const [modeDistribution, setModeDistribution] = useState<ModeCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspace) return
    setLoading(true)
    fetch("/api/stats")
      .then((r) => r.json())
      .then((json) => {
        setOverview(json.overview)
        setRecentMeetings(json.recentMeetings ?? [])
        setModeDistribution(json.modeDistribution ?? [])
      })
      .finally(() => setLoading(false))
  }, [activeWorkspace])

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

  const statCards = overview
    ? [
        { label: "Agents", value: overview.agents, icon: Bot, color: "bg-blue-50 dark:bg-blue-950 text-blue-600", href: "/agents" },
        { label: "ทีม", value: overview.teams, icon: Users, color: "bg-green-50 dark:bg-green-950 text-green-600", href: "/teams" },
        { label: "ประชุม", value: overview.meetings, icon: MessageSquare, color: "bg-purple-50 dark:bg-purple-950 text-purple-600", href: "/history" },
        { label: "Memory", value: overview.memoryFacts, icon: Brain, color: "bg-amber-50 dark:bg-amber-950 text-amber-600", href: "/memory" },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">แดชบอร์ด</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ภาพรวมทีมผู้เชี่ยวชาญ AI ของคุณ</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-2">
                    <div className="h-6 w-10 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-16 rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                </div>
              </div>
            ))
          : statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 hover:border-gray-300 dark:border-gray-600 hover:shadow-sm transition-all"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  </div>
                </Link>
              )
            })}
      </div>

      {/* Token Usage Card */}
      {overview && overview.totalTokens > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            Token ใช้ทั้งหมด
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {overview.totalTokens.toLocaleString()} <span className="text-sm font-normal text-gray-400">tokens</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Meetings */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">ประชุมล่าสุด</h2>
            {recentMeetings.length > 0 && (
              <Link href="/history" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                ดูทั้งหมด <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentMeetings.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">ยังไม่มีประวัติการประชุม</p>
              <Link href="/meeting" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                เริ่มประชุมแรก →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMeetings.map((m) => {
                const mode = modeConfig[m.mode] ?? { label: m.mode, emoji: "📋" }
                return (
                  <Link
                    key={m.id}
                    href={`/history/${m.id}`}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 dark:bg-gray-950 transition-colors"
                  >
                    <span className="text-xl">{mode.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{m.question}</p>
                      <p className="text-xs text-gray-400">{timeAgo(m.startedAt)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[m.status] ?? "bg-gray-100 dark:bg-gray-800"}`}>
                      {m.status === "completed" ? "✓" : m.status === "error" ? "✗" : m.status}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Actions + Mode Distribution */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">เริ่มต้นใช้งาน</h2>
            <div className="space-y-2">
              <Link
                href="/meeting"
                className="flex items-center gap-3 p-3 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 transition-colors"
              >
                <Zap className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-900">เริ่มประชุม</p>
                  <p className="text-xs text-purple-600">ถามคำถามกับทีม AI ผู้เชี่ยวชาญ</p>
                </div>
              </Link>
              <Link
                href="/agents/new"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-950 transition-colors"
              >
                <Bot className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">สร้าง Agent ใหม่</p>
                  <p className="text-xs text-gray-400">เพิ่มผู้เชี่ยวชาญ AI ในทีม</p>
                </div>
              </Link>
              <Link
                href="/teams/new"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-950 transition-colors"
              >
                <Users className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">สร้างทีมใหม่</p>
                  <p className="text-xs text-gray-400">จัดกลุ่ม agents เป็นทีมที่ปรึกษา</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Mode Distribution */}
          {modeDistribution.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">โหมดที่ใช้บ่อย</h2>
              <div className="space-y-2">
                {modeDistribution.map((md) => {
                  const mode = modeConfig[md.mode] ?? { label: md.mode, emoji: "📋" }
                  const totalMeetings = modeDistribution.reduce((s, m) => s + m.count, 0)
                  const pct = totalMeetings > 0 ? Math.round((md.count / totalMeetings) * 100) : 0
                  return (
                    <div key={md.mode} className="flex items-center gap-3">
                      <span className="text-lg">{mode.emoji}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 dark:text-gray-300">{mode.label}</span>
                          <span className="text-gray-400">{md.count} ครั้ง ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                          <div
                            className="bg-blue-500 rounded-full h-2 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

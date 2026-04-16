"use client"

import { useEffect, useState } from "react"
import { BarChart3, Zap, MessageSquare, Bot, Brain } from "lucide-react"
import { useWorkspace } from "@/components/providers/workspace-provider"

interface Stats {
  overview: {
    agents: number
    teams: number
    meetings: number
    totalTokens: number
    memoryFacts: number
  }
  tokenUsage: {
    date: string
    inputTokens: number
    outputTokens: number
    meetings: number
  }[]
  modeDistribution: { mode: string; count: number }[]
  topAgents: {
    agentId: string
    agentName: string
    agentEmoji: string
    totalInput: number
    totalOutput: number
    totalMeetings: number
  }[]
}

const modeEmoji: Record<string, string> = {
  quick_ask: "⚡",
  consult: "🤝",
  full_board: "🏛️",
}

const modeLabel: Record<string, string> = {
  quick_ask: "Quick Ask",
  consult: "Consult",
  full_board: "Full Board",
}

const modeColor: Record<string, string> = {
  quick_ask: "bg-yellow-400",
  consult: "bg-blue-500",
  full_board: "bg-purple-600",
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return n.toLocaleString()
}

export default function StatsPage() {
  const { activeWorkspace } = useWorkspace()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspace) return
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeWorkspace])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">สถิติ</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ภาพรวมการใช้งานระบบ</p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 h-8 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="py-12 text-center text-gray-400">
        <BarChart3 className="mx-auto h-12 w-12" />
        <p className="mt-3">ไม่สามารถโหลดสถิติได้</p>
      </div>
    )
  }

  const { overview, tokenUsage, modeDistribution, topAgents } = stats
  const totalMode = modeDistribution.reduce((s, m) => s + m.count, 0) || 1
  const maxDailyTokens = Math.max(
    ...tokenUsage.map((d) => d.inputTokens + d.outputTokens),
    1
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">สถิติ</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ภาพรวมการใช้งานระบบ</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={Bot} label="Agents" value={overview.agents} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-950" />
        <StatCard icon={MessageSquare} label="ประชุม" value={overview.meetings} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-950" />
        <StatCard icon={Zap} label="Tokens ทั้งหมด" value={formatNumber(overview.totalTokens)} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-950" />
        <StatCard icon={Brain} label="Memory Facts" value={overview.memoryFacts} color="text-green-600" bg="bg-green-50 dark:bg-green-950" />
        <StatCard icon={BarChart3} label="ทีม" value={overview.teams} color="text-indigo-600" bg="bg-indigo-50" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Token Usage Chart (last 7 days) */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Token Usage (7 วัน)</h2>
          {tokenUsage.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {tokenUsage.map((day) => {
                const total = day.inputTokens + day.outputTokens
                const pct = (total / maxDailyTokens) * 100
                const inputPct = total > 0 ? (day.inputTokens / total) * 100 : 0
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-400">{formatNumber(total)}</span>
                    <div className="w-full rounded-t overflow-hidden" style={{ height: `${Math.max(pct, 4)}%` }}>
                      <div className="bg-blue-500 w-full" style={{ height: `${inputPct}%` }} />
                      <div className="bg-blue-300 w-full" style={{ height: `${100 - inputPct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400">{day.date.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="mt-3 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-500" /> Input
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-300" /> Output
            </span>
          </div>
        </div>

        {/* Mode Distribution */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">รูปแบบประชุม</h2>
          {modeDistribution.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-4">
              {modeDistribution.map((m) => {
                const pct = Math.round((m.count / totalMode) * 100)
                return (
                  <div key={m.mode}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>
                        {modeEmoji[m.mode] ?? "📋"} {modeLabel[m.mode] ?? m.mode}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">{m.count} ครั้ง ({pct}%)</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${modeColor[m.mode] ?? "bg-gray-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top Agents */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Agent ที่ใช้งานมากสุด</h2>
          {topAgents.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">ยังไม่มีข้อมูลการใช้งาน</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500 dark:text-gray-400">
                    <th className="pb-2 font-medium">Agent</th>
                    <th className="pb-2 font-medium text-right">ประชุม</th>
                    <th className="pb-2 font-medium text-right">Input Tokens</th>
                    <th className="pb-2 font-medium text-right">Output Tokens</th>
                    <th className="pb-2 font-medium text-right">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topAgents.map((a) => (
                    <tr key={a.agentId}>
                      <td className="py-2">
                        <span className="mr-2">{a.agentEmoji}</span>
                        {a.agentName}
                      </td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-400">{a.totalMeetings}</td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-400">{formatNumber(a.totalInput)}</td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-400">{formatNumber(a.totalOutput)}</td>
                      <td className="py-2 text-right font-medium">{formatNumber(a.totalInput + a.totalOutput)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color: string
  bg: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
      </div>
    </div>
  )
}

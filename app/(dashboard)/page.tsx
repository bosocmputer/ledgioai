"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Bot, Users, MessageSquare, Brain,
  Zap, Clock, TrendingUp, ArrowRight, CheckCircle2, Circle,
} from "lucide-react"
import { useWorkspace } from "@/components/providers/workspace-provider"
import { PageInfo } from "@/components/ui/page-info"
import { ButtonLink } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { MetricCard } from "@/components/ui/metric-card"
import { PageHeader } from "@/components/ui/page-header"

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
        { label: "ผู้เชี่ยวชาญ", value: overview.agents, icon: Bot, color: "bg-blue-50 dark:bg-blue-950 text-blue-600", href: "/agents" },
        { label: "ทีม", value: overview.teams, icon: Users, color: "bg-green-50 dark:bg-green-950 text-green-600", href: "/teams" },
        { label: "ประชุม", value: overview.meetings, icon: MessageSquare, color: "bg-purple-50 dark:bg-purple-950 text-purple-600", href: "/history" },
        { label: "ความจำ", value: overview.memoryFacts, icon: Brain, color: "bg-amber-50 dark:bg-amber-950 text-amber-600", href: "/memory" },
      ]
    : []
  const onboardingSteps = overview
    ? [
        {
          title: "สร้างผู้เชี่ยวชาญ",
          description: "อย่างน้อย 1 คนสำหรับ Quick Ask",
          done: overview.agents > 0,
          href: "/agents/new",
        },
        {
          title: "จัดทีมที่ปรึกษา",
          description: "รวมหลายมุมมองสำหรับ Consult / Full Board",
          done: overview.teams > 0,
          href: "/teams/new",
        },
        {
          title: "เพิ่มข้อมูลบริษัท",
          description: "ช่วยให้ AI ตอบตามบริบทองค์กร",
          done: overview.memoryFacts > 0,
          href: "/settings",
        },
        {
          title: "เริ่มประชุมแรก",
          description: "ถามคำถามจริงและเก็บประวัติไว้ใช้อ้างอิง",
          done: overview.meetings > 0,
          href: "/meeting",
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="แดชบอร์ด"
        description="ภาพรวมเวิร์กสเปซ ทีมผู้เชี่ยวชาญ และการใช้งานล่าสุด"
        actions={<ButtonLink href="/meeting"><Zap className="h-4 w-4" /> เริ่มประชุม</ButtonLink>}
      />

      <PageInfo id="dashboard">
        เริ่มด้วยการ <strong>สร้างผู้เชี่ยวชาญ</strong> ก่อน — กำหนดบุคลิกและความเชี่ยวชาญของแต่ละคน จากนั้น <strong>จัดทีม</strong> รวมผู้เชี่ยวชาญที่ต้องใช้งานร่วมกัน แล้วเข้า <strong>ห้องประชุม</strong> เพื่อถามคำถาม ระบบจะให้แต่ละคนวิเคราะห์และถกเถียงกันก่อนสรุปคำตอบ
      </PageInfo>

      {overview && onboardingSteps.some((step) => !step.done) && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-blue-950 dark:text-blue-100">ตั้งค่าเวิร์กสเปซให้พร้อมใช้งาน</h2>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">ทำตามขั้นตอนสั้น ๆ เพื่อให้ทีม AI มีบริบทและเริ่มประชุมได้ลื่นขึ้น</p>
            </div>
            <ButtonLink href={onboardingSteps.find((step) => !step.done)?.href ?? "/meeting"} size="sm">
              ทำขั้นตอนถัดไป
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {onboardingSteps.map((step) => (
              <Link
                key={step.title}
                href={step.href}
                className="rounded-lg border border-blue-100 bg-white p-3 transition-colors hover:border-blue-300 dark:border-blue-900 dark:bg-gray-950"
              >
                <div className="flex items-start gap-2">
                  {step.done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 text-blue-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{step.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{step.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
                <MetricCard
                  key={stat.label}
                  href={stat.href}
                  label={stat.label}
                  value={stat.value}
                  icon={<Icon className="h-5 w-5" />}
                  toneClassName={stat.color}
                />
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
              <EmptyState
                icon={<Clock className="h-10 w-10" />}
                title="ยังไม่มีประวัติการประชุม"
                description="เริ่มประชุมแรกเพื่อดูสรุปและ transcript ได้ที่นี่"
                action={<ButtonLink href="/meeting" size="sm">เริ่มประชุมแรก</ButtonLink>}
                className="border-0 bg-transparent py-4 dark:bg-transparent"
              />
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
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">สร้างผู้เชี่ยวชาญใหม่</p>
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
                  <p className="text-xs text-gray-400">จัดกลุ่มผู้เชี่ยวชาญเป็นทีมที่ปรึกษา</p>
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

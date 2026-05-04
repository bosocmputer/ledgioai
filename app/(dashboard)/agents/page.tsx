"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bot, Plus, Trash2, Pencil, Zap } from "lucide-react"
import { useWorkspace } from "@/components/providers/workspace-provider"
import { AgentPreviewModal } from "@/components/agents/agent-preview-modal"
import { PageInfo } from "@/components/ui/page-info"
import { Badge } from "@/components/ui/badge"
import { ButtonLink } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { SearchInput } from "@/components/ui/search-input"

interface Agent {
  id: string
  name: string
  emoji: string
  role: string
  provider: string
  model: string
  isActive: boolean
  hasApiKey: boolean
  seniority: number | null
  createdAt: string
}

export default function AgentsPage() {
  const { activeWorkspace } = useWorkspace()
  const [agents, setAgents] = useState<Agent[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [previewAgent, setPreviewAgent] = useState<Agent | null>(null)

  useEffect(() => {
    if (!activeWorkspace) return
    fetchAgents()
  }, [activeWorkspace])

  async function fetchAgents() {
    setLoading(true)
    try {
      const res = await fetch("/api/agents")
      const json = await res.json()
      setAgents(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("ต้องการลบ Agent นี้?")) return
    const res = await fetch(`/api/agents/${id}`, { method: "DELETE" })
    if (res.ok) {
      setAgents((prev) => prev.filter((a) => a.id !== id))
    }
  }

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="ผู้เชี่ยวชาญ"
        description={`ผู้เชี่ยวชาญ AI ของเวิร์กสเปซนี้ (${agents.length} คน)`}
        actions={
          <ButtonLink href="/agents/new">
            <Plus className="h-4 w-4" />
            สร้างผู้เชี่ยวชาญ
          </ButtonLink>
        }
      />

      <PageInfo id="agents">
        Agent คือผู้เชี่ยวชาญ AI ที่คุณกำหนดเองได้ทั้งหมด — ตั้งแต่บุคลิก ความเชี่ยวชาญ ไปจนถึง LLM ที่ใช้ขับเคลื่อน เช่น สร้าง <strong>"ที่ปรึกษาภาษี VAT"</strong> ที่รู้กฎหมายภาษีอากรลึกกว่า ChatGPT ทั่วไป เพราะคุณเป็นคนเขียน soul และอัปโหลด knowledge base ให้เอง กดไอคอน ⚡ เพื่อทดสอบ agent ก่อนนำไปใช้งานจริง
      </PageInfo>

      <SearchInput
        placeholder="ค้นหาชื่อหรือบทบาทผู้เชี่ยวชาญ..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
      />

      {/* Agent Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-5 w-14 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="h-5 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Bot className="h-12 w-12" />}
          title={agents.length === 0 ? "ยังไม่มีผู้เชี่ยวชาญ" : "ไม่พบผลลัพธ์"}
          description={agents.length === 0 ? "สร้างผู้เชี่ยวชาญ AI คนแรกเพื่อเริ่มถามงานจริง" : "ลองค้นหาด้วยชื่อหรือบทบาทอื่น"}
          action={
            agents.length === 0 ? (
              <ButtonLink href="/agents/new">
                <Plus className="h-4 w-4" />
                สร้างผู้เชี่ยวชาญ
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <div
              key={agent.id}
              className="group relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 transition-shadow hover:shadow-md"
            >
              {/* Actions */}
              <div className="absolute right-3 top-3 flex gap-1 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100">
                <button
                  onClick={() => setPreviewAgent(agent)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950"
                  title="ทดสอบ Agent"
                >
                  <Zap className="h-4 w-4" />
                </button>
                <Link
                  href={`/agents/${agent.id}`}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDelete(agent.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <Link href={`/agents/${agent.id}`} className="block">
                {/* Avatar */}
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-2xl">
                    {agent.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-gray-900 dark:text-gray-100">
                      {agent.name}
                    </h3>
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">{agent.role}</p>
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="blue">{agent.provider}</Badge>
                  <Badge>{agent.model}</Badge>
                  {agent.hasApiKey && (
                    <Badge tone="green">API key</Badge>
                  )}
                  {agent.seniority != null && agent.seniority > 0 && (
                    <Badge tone="amber" title={`อาวุโส ${agent.seniority}/10`}>
                      {"⭐".repeat(Math.min(agent.seniority, 5))}
                    </Badge>
                  )}
                  {!agent.isActive && (
                    <Badge>ปิดใช้งาน</Badge>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Agent Preview Modal */}
      {previewAgent && (
        <AgentPreviewModal
          agentId={previewAgent.id}
          agentName={previewAgent.name}
          agentEmoji={previewAgent.emoji}
          onClose={() => setPreviewAgent(null)}
        />
      )}
    </div>
  )
}

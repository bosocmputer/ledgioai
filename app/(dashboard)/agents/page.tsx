"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bot, Plus, Search, Trash2, Pencil, Zap } from "lucide-react"
import { useWorkspace } from "@/components/providers/workspace-provider"
import { AgentPreviewModal } from "@/components/agents/agent-preview-modal"

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agents</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ผู้เชี่ยวชาญ AI ของคุณ ({agents.length} คน)
          </p>
        </div>
        <Link
          href="/agents/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          สร้าง Agent
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหา agent..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

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
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 py-12 text-center">
          <Bot className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-sm font-medium text-gray-900 dark:text-gray-100">
            {agents.length === 0 ? "ยังไม่มี Agent" : "ไม่พบผลลัพธ์"}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {agents.length === 0
              ? "สร้างผู้เชี่ยวชาญ AI คนแรกของคุณ"
              : "ลองค้นหาด้วยคำอื่น"}
          </p>
          {agents.length === 0 && (
            <Link
              href="/agents/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              สร้าง Agent
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <div
              key={agent.id}
              className="group relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 transition-shadow hover:shadow-md"
            >
              {/* Actions */}
              <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => setPreviewAgent(agent)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-amber-50 dark:bg-amber-950 hover:text-amber-600"
                  title="ทดสอบ Agent"
                >
                  <Zap className="h-4 w-4" />
                </button>
                <Link
                  href={`/agents/${agent.id}`}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:bg-gray-800 hover:text-gray-600 dark:text-gray-400"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDelete(agent.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 dark:bg-red-950 hover:text-red-600"
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
                  <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                    {agent.provider}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                    {agent.model}
                  </span>
                  {agent.hasApiKey && (
                    <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-950 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
                      🔑 API Key
                    </span>
                  )}
                  {agent.seniority != null && agent.seniority > 0 && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300" title={`อาวุโส ${agent.seniority}/10`}>
                      {"⭐".repeat(Math.min(agent.seniority, 5))}
                    </span>
                  )}
                  {!agent.isActive && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                      ปิดใช้งาน
                    </span>
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

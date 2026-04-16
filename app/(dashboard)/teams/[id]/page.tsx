"use client"

import { useEffect, useState, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"
import { DragDropAgentPicker } from "@/components/agents/drag-drop-agent-picker"

interface Agent {
  id: string
  name: string
  emoji: string
  role: string
}

interface Team {
  id: string
  name: string
  emoji: string
  description: string | null
  agents: Agent[]
}

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [allAgents, setAllAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [form, setForm] = useState({
    name: "",
    emoji: "",
    description: "",
  })
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])

  const fetchTeam = useCallback(async () => {
    const res = await fetch(`/api/teams/${id}`)
    if (!res.ok) {
      router.push("/teams")
      return
    }
    const json = await res.json()
    const t = json.data
    setTeam(t)
    setForm({
      name: t.name,
      emoji: t.emoji,
      description: t.description ?? "",
    })
    setSelectedAgentIds(t.agents.map((a: Agent) => a.id))
  }, [id, router])

  const fetchAgents = useCallback(async () => {
    const res = await fetch("/api/agents")
    if (res.ok) {
      const json = await res.json()
      setAllAgents(json.data ?? [])
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchTeam(), fetchAgents()]).finally(() => setLoading(false))
  }, [fetchTeam, fetchAgents])

  function toggleAgent(agentId: string) {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId)
        ? prev.filter((i) => i !== agentId)
        : [...prev, agentId]
    )
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (selectedAgentIds.length === 0) {
      setError("กรุณาเลือก Agent อย่างน้อย 1 คน")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          agentIds: selectedAgentIds,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error || "เกิดข้อผิดพลาด")
        return
      }

      setSuccess("บันทึกเรียบร้อยแล้ว")
      await fetchTeam()
      setTimeout(() => setSuccess(""), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        กำลังโหลด...
      </div>
    )
  }

  if (!team) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/teams"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:bg-gray-800 hover:text-gray-600 dark:text-gray-400"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{team.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{team.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {team.agents.length} สมาชิก
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Team Info */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">ข้อมูลทีม</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex gap-4">
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Emoji
                </label>
                <input
                  name="emoji"
                  value={form.emoji}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-center text-2xl focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ชื่อทีม
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                รายละเอียด
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Agent Selection — Drag & Drop */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">
            สมาชิก ({selectedAgentIds.length} คน)
          </h2>
          <DragDropAgentPicker
            agents={allAgents}
            selectedIds={selectedAgentIds}
            onChange={setSelectedAgentIds}
          />
        </div>

        {/* Messages */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700 dark:text-green-300">
            {success}
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </form>
    </div>
  )
}

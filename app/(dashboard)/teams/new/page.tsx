"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { DragDropAgentPicker } from "@/components/agents/drag-drop-agent-picker"

interface Agent {
  id: string
  name: string
  emoji: string
  role: string
  provider: string
  model: string
}

export default function NewTeamPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    emoji: "🏛️",
    description: "",
  })
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((json) => setAgents(json.data ?? []))
  }, [])

  function toggleAgent(agentId: string) {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    )
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (selectedAgentIds.length === 0) {
      setError("กรุณาเลือก Agent อย่างน้อย 1 คน")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
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

      const json = await res.json()
      router.push(`/teams/${json.data.id}`)
    } finally {
      setSaving(false)
    }
  }

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">สร้างทีมใหม่</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            รวม AI Agents เข้าเป็นทีมเดียวกัน
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                  placeholder="เช่น ทีมที่ปรึกษาหลัก"
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
                placeholder="อธิบายจุดประสงค์ของทีม..."
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Agent Selection — Drag & Drop */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">
            เลือกสมาชิก ({selectedAgentIds.length} คน)
          </h2>
          {agents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 py-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ยังไม่มี Agent —{" "}
                <Link href="/agents/new" className="text-blue-600 hover:underline">
                  สร้าง Agent ก่อน
                </Link>
              </p>
            </div>
          ) : (
            <DragDropAgentPicker
              agents={agents}
              selectedIds={selectedAgentIds}
              onChange={setSelectedAgentIds}
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/teams"
            className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-950"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "สร้างทีม"}
          </button>
        </div>
      </form>
    </div>
  )
}

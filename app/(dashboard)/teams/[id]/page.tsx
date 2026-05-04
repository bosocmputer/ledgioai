"use client"

import { useEffect, useState, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, UsersRound } from "lucide-react"
import { DragDropAgentPicker } from "@/components/agents/drag-drop-agent-picker"
import { Button, ButtonLink } from "@/components/ui/button"
import { FormSection, Field, inputClasses, textareaClasses } from "@/components/ui/form-section"
import { PageHeader } from "@/components/ui/page-header"

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
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <PageHeader
        title={`${team.emoji} ${team.name}`}
        description={`${team.agents.length} สมาชิกในทีม`}
        actions={
          <ButtonLink href="/teams" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </ButtonLink>
        }
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Team Info */}
        <FormSection title="ข้อมูลทีม" description="แก้ชื่อ รายละเอียด และภาพจำของทีม" icon={<UsersRound className="h-5 w-5" />}>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex gap-4">
              <Field label="Emoji" className="w-24">
                <input
                  name="emoji"
                  value={form.emoji}
                  onChange={handleChange}
                  className={`${inputClasses} text-center text-2xl`}
                />
              </Field>
              <Field label="ชื่อทีม" className="flex-1">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className={inputClasses}
                />
              </Field>
            </div>
            <Field label="รายละเอียด">
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                className={textareaClasses}
              />
            </Field>
          </div>
        </FormSection>

        {/* Agent Selection — Drag & Drop */}
        <FormSection title={`สมาชิก (${selectedAgentIds.length} คน)`} description="ลากเพื่อจัดลำดับการเข้าประชุม">
          <DragDropAgentPicker
            agents={allAgents}
            selectedIds={selectedAgentIds}
            onChange={setSelectedAgentIds}
          />
        </FormSection>

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
          <Button
            type="submit"
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </form>
    </div>
  )
}

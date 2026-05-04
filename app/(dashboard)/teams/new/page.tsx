"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, UsersRound } from "lucide-react"
import { DragDropAgentPicker } from "@/components/agents/drag-drop-agent-picker"
import { Button, ButtonLink } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { FormSection, Field, inputClasses, textareaClasses } from "@/components/ui/form-section"
import { PageHeader } from "@/components/ui/page-header"

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
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <PageHeader
        title="สร้างทีมใหม่"
        description="รวมผู้เชี่ยวชาญหลายคนเพื่อใช้ในโหมด Consult หรือ Full Board"
        actions={
          <ButtonLink href="/teams" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </ButtonLink>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Team Info */}
        <FormSection title="ข้อมูลทีม" description="ตั้งชื่อ ภาพจำ และจุดประสงค์ของทีม" icon={<UsersRound className="h-5 w-5" />}>
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
                  placeholder="เช่น ทีมที่ปรึกษาหลัก"
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
                placeholder="อธิบายจุดประสงค์ของทีม..."
                className={textareaClasses}
              />
            </Field>
          </div>
        </FormSection>

        {/* Agent Selection — Drag & Drop */}
        <FormSection title={`เลือกสมาชิก (${selectedAgentIds.length} คน)`} description="ลากเพื่อจัดลำดับการเข้าประชุม">
          {agents.length === 0 ? (
            <EmptyState
              title="ยังไม่มีผู้เชี่ยวชาญ"
              description="สร้างผู้เชี่ยวชาญก่อน แล้วกลับมาเพิ่มเข้าทีม"
              action={<ButtonLink href="/agents/new">สร้างผู้เชี่ยวชาญ</ButtonLink>}
            />
          ) : (
            <DragDropAgentPicker
              agents={agents}
              selectedIds={selectedAgentIds}
              onChange={setSelectedAgentIds}
            />
          )}
        </FormSection>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <ButtonLink href="/teams" variant="secondary">
            ยกเลิก
          </ButtonLink>
          <Button
            type="submit"
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? "กำลังบันทึก..." : "สร้างทีม"}
          </Button>
        </div>
      </form>
    </div>
  )
}

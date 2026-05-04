"use client"

import { useEffect, useState, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Brain, Cpu, Save, Settings2, Upload, Trash2, FileText, UserRound } from "lucide-react"
import { Button, ButtonLink } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { FormSection, Field, inputClasses, textareaClasses } from "@/components/ui/form-section"
import { PageHeader } from "@/components/ui/page-header"

interface Agent {
  id: string
  name: string
  emoji: string
  role: string
  soul: string
  provider: string
  model: string
  baseUrl: string | null
  hasApiKey: boolean
  isActive: boolean
  useWebSearch: boolean
  seniority: number | null
  trustedUrls: string[]
}

interface Knowledge {
  id: string
  filename: string
  mimeType: string | null
  meta: string | null
  tokens: number
  uploadedAt: string
  preview: string
}

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Google Gemini" },
  { value: "ollama", label: "Ollama (Local)" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "custom", label: "Custom" },
]

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [knowledge, setKnowledge] = useState<Knowledge[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Form state
  const [form, setForm] = useState({
    name: "",
    emoji: "",
    role: "",
    soul: "",
    provider: "",
    model: "",
    apiKey: "",
    baseUrl: "",
    useWebSearch: false,
    seniority: 50,
  })

  const fetchAgent = useCallback(async () => {
    const res = await fetch(`/api/agents/${id}`)
    if (!res.ok) {
      router.push("/agents")
      return
    }
    const json = await res.json()
    const a = json.data
    setAgent(a)
    setForm({
      name: a.name,
      emoji: a.emoji,
      role: a.role,
      soul: a.soul,
      provider: a.provider,
      model: a.model,
      apiKey: "",
      baseUrl: a.baseUrl ?? "",
      useWebSearch: a.useWebSearch,
      seniority: a.seniority ?? 50,
    })
  }, [id, router])

  const fetchKnowledge = useCallback(async () => {
    const res = await fetch(`/api/agents/${id}/knowledge`)
    if (res.ok) {
      const json = await res.json()
      setKnowledge(json.data ?? [])
    }
  }, [id])

  useEffect(() => {
    Promise.all([fetchAgent(), fetchKnowledge()]).finally(() =>
      setLoading(false)
    )
  }, [fetchAgent, fetchKnowledge])

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
            ? Number(value)
            : value,
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const payload: Record<string, unknown> = { ...form }
      if (!form.apiKey) delete payload.apiKey // Only update if new key provided

      const res = await fetch(`/api/agents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error || "เกิดข้อผิดพลาด")
        return
      }

      setSuccess("บันทึกเรียบร้อยแล้ว")
      await fetchAgent()
      setTimeout(() => setSuccess(""), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`/api/agents/${id}/knowledge/upload`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error || "อัปโหลดไม่สำเร็จ")
        return
      }

      await fetchKnowledge()
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  async function handleDeleteKnowledge(knowledgeId: string) {
    if (!confirm("ต้องการลบเอกสารนี้?")) return
    const res = await fetch(`/api/agents/${id}/knowledge/${knowledgeId}`, {
      method: "DELETE",
    })
    if (res.ok) {
      setKnowledge((prev) => prev.filter((k) => k.id !== knowledgeId))
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        กำลังโหลด...
      </div>
    )
  }

  if (!agent) return null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <PageHeader
        title={`${agent.emoji} ${agent.name}`}
        description={agent.role}
        actions={
          <ButtonLink href="/agents" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </ButtonLink>
        }
      />

      {/* Edit Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Identity */}
        <FormSection title="ตัวตน" description="ชื่อ บทบาท และภาพจำที่จะแสดงในห้องประชุม" icon={<UserRound className="h-5 w-5" />}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 flex gap-4">
              <Field label="Emoji" className="w-24">
                <input
                  name="emoji"
                  value={form.emoji}
                  onChange={handleChange}
                  className={`${inputClasses} text-center text-2xl`}
                />
              </Field>
              <Field label="ชื่อผู้เชี่ยวชาญ" className="flex-1">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className={inputClasses}
                />
              </Field>
            </div>
            <Field label="บทบาท" className="sm:col-span-2">
              <input
                name="role"
                value={form.role}
                onChange={handleChange}
                required
                className={inputClasses}
              />
            </Field>
          </div>
        </FormSection>

        {/* LLM Config */}
        <FormSection title="โมเดลและ API" description="เว้น API Key ว่างไว้หากไม่ต้องการเปลี่ยน key เดิม" icon={<Cpu className="h-5 w-5" />}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Provider">
              <select
                name="provider"
                value={form.provider}
                onChange={handleChange}
                className={inputClasses}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Model">
              <input
                name="model"
                value={form.model}
                onChange={handleChange}
                required
                className={inputClasses}
              />
            </Field>
            <Field label="API Key" className="sm:col-span-2">
              <input
                name="apiKey"
                type="password"
                value={form.apiKey}
                onChange={handleChange}
                placeholder={
                  agent.hasApiKey
                    ? "••• (เว้นว่างถ้าไม่ต้องการเปลี่ยน)"
                    : "sk-..."
                }
                className={`${inputClasses} font-mono`}
              />
            </Field>
            {(form.provider === "ollama" || form.provider === "custom") && (
              <Field label="Base URL" className="sm:col-span-2">
                <input
                  name="baseUrl"
                  value={form.baseUrl}
                  onChange={handleChange}
                  placeholder="http://localhost:11434"
                  className={inputClasses}
                />
              </Field>
            )}
          </div>
        </FormSection>

        {/* Soul */}
        <FormSection title="Soul / System Prompt" description="นิสัย วิธีคิด ขอบเขตความเชี่ยวชาญ และรูปแบบคำตอบ" icon={<Brain className="h-5 w-5" />}>
          <textarea
            name="soul"
            value={form.soul}
            onChange={handleChange}
            required
            rows={8}
            className={textareaClasses}
          />
        </FormSection>

        {/* Advanced */}
        <FormSection title="การทำงานขั้นสูง" icon={<Settings2 className="h-5 w-5" />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Web Search</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ให้ agent ค้นหาข้อมูลจากเว็บ
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  name="useWebSearch"
                  checked={form.useWebSearch}
                  onChange={handleChange}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-gray-200 dark:bg-gray-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white dark:bg-gray-900 after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full" />
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Seniority ({form.seniority})
              </label>
              <input
                type="range"
                name="seniority"
                min={1}
                max={99}
                value={form.seniority}
                onChange={handleChange}
                className="mt-2 w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>อาวุโสสูง (1)</span>
                <span>อาวุโสต่ำ (99)</span>
              </div>
            </div>
          </div>
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

      {/* Knowledge Base */}
      <FormSection
        title={`คลังความรู้ (${knowledge.length})`}
        description="เอกสารเหล่านี้จะช่วยให้ผู้เชี่ยวชาญตอบโดยอิงข้อมูลของ workspace"
        actions={
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-700 transition-colors">
            <Upload className="h-4 w-4" />
            {uploading ? "กำลังอัปโหลด..." : "อัปโหลด"}
            <input
              type="file"
              accept=".pdf,.xlsx,.docx,.csv,.json,.txt,.md"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        }
      >

        {knowledge.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title="ยังไม่มีเอกสาร"
            description="อัปโหลด PDF, Excel, Word, CSV, TXT หรือ MD เพื่อเพิ่มบริบทให้ผู้เชี่ยวชาญ"
          />
        ) : (
          <div className="space-y-3">
            {knowledge.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {k.filename}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {k.meta} · {k.tokens.toLocaleString()} tokens
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteKnowledge(k.id)}
                  className="ml-3 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 dark:bg-red-950 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </FormSection>
    </div>
  )
}

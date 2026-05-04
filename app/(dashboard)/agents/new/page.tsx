"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Brain, Cpu, Save, Settings2, Sparkles, UserRound } from "lucide-react"
import { Button, ButtonLink } from "@/components/ui/button"
import { FormSection, Field, inputClasses, textareaClasses } from "@/components/ui/form-section"
import { PageHeader } from "@/components/ui/page-header"

interface Template {
  id: string
  name: string
  emoji: string
  role: string
  soul: string
  suggestedProvider: string | null
  suggestedModel: string | null
  seniority: number | null
  useWebSearch: boolean
  category: string | null
  description: string | null
}

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Google Gemini" },
  { value: "ollama", label: "Ollama (Local)" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "custom", label: "Custom" },
]

export default function NewAgentPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [showTemplates, setShowTemplates] = useState(true)

  // Form state
  const [form, setForm] = useState({
    name: "",
    emoji: "🤖",
    provider: "anthropic",
    apiKey: "",
    baseUrl: "",
    model: "claude-sonnet-4-6",
    soul: "",
    role: "",
    useWebSearch: false,
    seniority: 50,
  })

  useEffect(() => {
    fetch("/api/agent-templates")
      .then((r) => r.json())
      .then((json) => setTemplates(json.data ?? []))
  }, [])

  function applyTemplate(tpl: Template) {
    setForm((prev) => ({
      ...prev,
      name: tpl.name,
      emoji: tpl.emoji,
      role: tpl.role,
      soul: tpl.soul,
      provider: tpl.suggestedProvider ?? "anthropic",
      model: tpl.suggestedModel ?? "claude-sonnet-4-6",
      seniority: tpl.seniority ?? 50,
      useWebSearch: tpl.useWebSearch,
    }))
    setShowTemplates(false)
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked
        : type === "number" ? Number(value)
        : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error || "เกิดข้อผิดพลาด")
        return
      }

      const json = await res.json()
      router.push(`/agents/${json.data.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <PageHeader
        title="สร้างผู้เชี่ยวชาญใหม่"
        description="เลือกจากเทมเพลตหรือกำหนดบุคลิก ความถนัด และโมเดลเอง"
        actions={
          <ButtonLink href="/agents" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </ButtonLink>
        }
      />

      {/* Template Gallery */}
      {showTemplates && templates.length > 0 && (
        <FormSection
          title="เริ่มจากเทมเพลต"
          description="เติมบทบาท prompt และโมเดลแนะนำให้พร้อมแก้ต่อ"
          icon={<Sparkles className="h-5 w-5 text-amber-500" />}
          actions={
            <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>
              สร้างเอง
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl)}
                className="flex min-h-36 flex-col items-center rounded-lg border border-gray-200 p-4 text-center transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-950"
              >
                <span className="text-3xl">{tpl.emoji}</span>
                <span className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {tpl.name}
                </span>
                <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{tpl.role}</span>
              </button>
            ))}
          </div>
        </FormSection>
      )}

      {/* Agent Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
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
                  placeholder="เช่น สมชาย นักบัญชี"
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
                placeholder="เช่น ผู้เชี่ยวชาญภาษีอากร"
                className={inputClasses}
              />
            </Field>
          </div>
        </FormSection>

        {/* LLM Config */}
        <FormSection title="โมเดลและ API" description="ตั้งค่า provider, model และ key ที่จะใช้ตอบในห้องประชุม" icon={<Cpu className="h-5 w-5" />}>
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
                placeholder="เช่น claude-sonnet-4-6"
                className={inputClasses}
              />
            </Field>
            <Field label="API Key" description="API Key จะถูกเข้ารหัส AES-256-GCM ก่อนบันทึก" className="sm:col-span-2">
              <input
                name="apiKey"
                type="password"
                value={form.apiKey}
                onChange={handleChange}
                required
                placeholder="sk-..."
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

        {/* Soul (System Prompt) */}
        <FormSection title="Soul / System Prompt" description="นิสัย วิธีคิด ขอบเขตความเชี่ยวชาญ และรูปแบบคำตอบ" icon={<Brain className="h-5 w-5" />}>
          <textarea
            name="soul"
            value={form.soul}
            onChange={handleChange}
            required
            rows={8}
            placeholder="คุณคือผู้เชี่ยวชาญด้าน..."
            className={textareaClasses}
          />
        </FormSection>

        {/* Advanced */}
        <FormSection title="การทำงานขั้นสูง" icon={<Settings2 className="h-5 w-5" />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Web Search</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">ให้ agent ค้นหาข้อมูลจากเว็บ</p>
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

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <ButtonLink href="/agents" variant="secondary">
            ยกเลิก
          </ButtonLink>
          <Button
            type="submit"
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? "กำลังบันทึก..." : "สร้างผู้เชี่ยวชาญ"}
          </Button>
        </div>
      </form>
    </div>
  )
}

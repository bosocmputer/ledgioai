"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"

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
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/agents"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:bg-gray-800 hover:text-gray-600 dark:text-gray-400"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">สร้าง Agent ใหม่</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            สร้างผู้เชี่ยวชาญ AI จากเทมเพลตหรือตั้งค่าเอง
          </p>
        </div>
      </div>

      {/* Template Gallery */}
      {showTemplates && templates.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">เลือกเทมเพลต</h2>
            </div>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
            >
              สร้างเอง →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl)}
                className="flex flex-col items-center rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center hover:border-blue-300 hover:bg-blue-50 dark:bg-blue-950 transition-colors"
              >
                <span className="text-3xl">{tpl.emoji}</span>
                <span className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {tpl.name}
                </span>
                <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{tpl.role}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agent Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Identity</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 flex gap-4">
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Emoji</label>
                <input
                  name="emoji"
                  value={form.emoji}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-center text-2xl focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชื่อ Agent</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="เช่น สมชาย นักบัญชี"
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">บทบาท</label>
              <input
                name="role"
                value={form.role}
                onChange={handleChange}
                required
                placeholder="เช่น ผู้เชี่ยวชาญภาษีอากร"
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* LLM Config */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">LLM Configuration</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Provider</label>
              <select
                name="provider"
                value={form.provider}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
              <input
                name="model"
                value={form.model}
                onChange={handleChange}
                required
                placeholder="เช่น claude-sonnet-4-6"
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
              <input
                name="apiKey"
                type="password"
                value={form.apiKey}
                onChange={handleChange}
                required
                placeholder="sk-..."
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                API Key จะถูกเข้ารหัส AES-256-GCM ก่อนบันทึก
              </p>
            </div>
            {(form.provider === "ollama" || form.provider === "custom") && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Base URL</label>
                <input
                  name="baseUrl"
                  value={form.baseUrl}
                  onChange={handleChange}
                  placeholder="http://localhost:11434"
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Soul (System Prompt) */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Soul (System Prompt)</h2>
          <textarea
            name="soul"
            value={form.soul}
            onChange={handleChange}
            required
            rows={8}
            placeholder="คุณคือผู้เชี่ยวชาญด้าน..."
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Advanced */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Advanced</h2>
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
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/agents"
            className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-950"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "สร้าง Agent"}
          </button>
        </div>
      </form>
    </div>
  )
}

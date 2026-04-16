"use client"

import { useEffect, useState, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Upload, Trash2, FileText } from "lucide-react"

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
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/agents"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:bg-gray-800 hover:text-gray-600 dark:text-gray-400"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{agent.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{agent.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{agent.role}</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Identity */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Identity</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 flex gap-4">
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
                  ชื่อ Agent
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
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                บทบาท
              </label>
              <input
                name="role"
                value={form.role}
                onChange={handleChange}
                required
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Provider
              </label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Model
              </label>
              <input
                name="model"
                value={form.model}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                API Key
              </label>
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
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {(form.provider === "ollama" || form.provider === "custom") && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Base URL
                </label>
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

        {/* Soul */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">
            Soul (System Prompt)
          </h2>
          <textarea
            name="soul"
            value={form.soul}
            onChange={handleChange}
            required
            rows={8}
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

      {/* Knowledge Base */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Knowledge Base ({knowledge.length})
          </h2>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-700 transition-colors">
            <Upload className="h-4 w-4" />
            {uploading ? "กำลังอัปโหลด..." : "อัปโหลด"}
            <input
              type="file"
              accept=".pdf,.xlsx,.xls,.docx,.csv,.json,.txt,.md"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {knowledge.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 py-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              ยังไม่มีเอกสาร — อัปโหลด PDF, Excel, Word, CSV, TXT หรือ MD
            </p>
          </div>
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
      </div>
    </div>
  )
}

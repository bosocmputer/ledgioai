"use client"

import { useEffect, useState, useCallback } from "react"
import { useWorkspace } from "@/components/providers/workspace-provider"
import {
  Settings, Users, Shield, Globe, Cpu, Save, Loader2,
  Mail, UserPlus, Crown, Eye, UserCheck, Copy, Check,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Field, FormSection, inputClasses } from "@/components/ui/form-section"
import { PageHeader } from "@/components/ui/page-header"

// ── Types ──────────────────────────────────────────────

interface WorkspaceDetail {
  id: string
  name: string
  slug: string | null
  createdAt: string
  role: string
  settings: {
    defaultProvider: string | null
    defaultModel: string | null
    maxTokensPerMeeting: number | null
    maxMeetingsPerDay: number | null
    enableWebSearch: boolean
    enableMcp: boolean
    hasSerperKey: boolean
    hasSerpKey: boolean
  } | null
}

interface Member {
  memberId: string
  userId: string
  role: string
  createdAt: string
}

const providerOptions = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "google", label: "Google (Gemini)" },
  { value: "ollama", label: "Ollama (Local)" },
  { value: "custom", label: "Custom" },
]

const roleIcons: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: UserCheck,
  viewer: Eye,
}

const roleLabels: Record<string, { label: string; color: string }> = {
  owner: { label: "เจ้าของ", color: "bg-purple-100 text-purple-700" },
  admin: { label: "แอดมิน", color: "bg-blue-100 text-blue-700 dark:text-blue-300" },
  member: { label: "สมาชิก", color: "bg-green-100 text-green-700 dark:text-green-300" },
  viewer: { label: "ผู้ดู", color: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" },
}

// ── Main Component ─────────────────────────────────────

export default function SettingsPage() {
  const { activeWorkspace } = useWorkspace()

  const [detail, setDetail] = useState<WorkspaceDetail | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<"general" | "members" | "search">("general")

  // Settings form
  const [defaultProvider, setDefaultProvider] = useState("")
  const [defaultModel, setDefaultModel] = useState("")
  const [maxTokens, setMaxTokens] = useState(50000)
  const [maxMeetings, setMaxMeetings] = useState(100)
  const [enableWebSearch, setEnableWebSearch] = useState(true)
  const [enableMcp, setEnableMcp] = useState(false)
  const [serperApiKey, setSerperApiKey] = useState("")
  const [serpApiKey, setSerpApiKey] = useState("")

  // Invite
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState("")

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const isAdmin = detail?.role === "owner" || detail?.role === "admin"

  const fetchDetail = useCallback(async () => {
    if (!activeWorkspace) return
    setLoading(true)
    try {
      const [detailRes, membersRes] = await Promise.all([
        fetch(`/api/workspaces/${activeWorkspace.id}`),
        fetch(`/api/workspaces/${activeWorkspace.id}/members`),
      ])
      const detailJson = await detailRes.json()
      const membersJson = await membersRes.json()

      const d = detailJson.data as WorkspaceDetail
      setDetail(d)
      setMembers(membersJson.data ?? [])

      // Populate form
      if (d.settings) {
        setDefaultProvider(d.settings.defaultProvider ?? "")
        setDefaultModel(d.settings.defaultModel ?? "")
        setMaxTokens(d.settings.maxTokensPerMeeting ?? 50000)
        setMaxMeetings(d.settings.maxMeetingsPerDay ?? 100)
        setEnableWebSearch(d.settings.enableWebSearch)
        setEnableMcp(d.settings.enableMcp)
      }
    } finally {
      setLoading(false)
    }
  }, [activeWorkspace])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  async function handleSave() {
    if (!activeWorkspace || !isAdmin) return
    setSaving(true)
    try {
      const settings: Record<string, unknown> = {
        defaultProvider: defaultProvider || undefined,
        defaultModel: defaultModel || undefined,
        maxTokensPerMeeting: maxTokens,
        maxMeetingsPerDay: maxMeetings,
        enableWebSearch,
        enableMcp,
      }
      if (serperApiKey) settings.serperApiKey = serperApiKey
      if (serpApiKey) settings.serpApiKey = serpApiKey

      const res = await fetch(`/api/workspaces/${activeWorkspace.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })

      if (res.ok) {
        setSaved(true)
        setSerperApiKey("")
        setSerpApiKey("")
        setTimeout(() => setSaved(false), 2000)
        await fetchDetail()
      } else {
        const json = await res.json()
        alert(json.error || "บันทึกไม่สำเร็จ")
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkspace || !inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg("")
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      if (res.ok) {
        setInviteMsg("✅ ส่งคำเชิญสำเร็จ")
        setInviteEmail("")
      } else {
        const json = await res.json()
        setInviteMsg(`❌ ${json.error || "ส่งคำเชิญไม่สำเร็จ"}`)
      }
    } finally {
      setInviting(false)
    }
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      </div>
    )
  }

  if (!detail) {
    return (
      <EmptyState
        icon={<Settings className="h-12 w-12" />}
        title="ไม่พบข้อมูลเวิร์กสเปซ"
        description="เลือกเวิร์กสเปซก่อนเข้าหน้าตั้งค่า"
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ตั้งค่าเวิร์กสเปซ"
        description={detail.name}
        actions={<Badge className={roleLabels[detail.role]?.color}>{roleLabels[detail.role]?.label ?? detail.role}</Badge>}
      />

      {/* Workspace ID */}
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-4 py-2.5 text-sm">
        <span className="text-gray-500 dark:text-gray-400">Workspace ID:</span>
        <code className="font-mono text-gray-700 dark:text-gray-300">{detail.id}</code>
        <button onClick={() => copyId(detail.id)} className="ml-auto text-gray-400 hover:text-gray-600 dark:text-gray-400">
          {copiedId === detail.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        {[
          { key: "general" as const, label: "ทั่วไป", icon: Cpu },
          { key: "members" as const, label: "สมาชิก", icon: Users },
          { key: "search" as const, label: "Web Search", icon: Globe },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === key ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: General */}
      {tab === "general" && (
        <FormSection title="ตั้งค่า LLM เริ่มต้น" description="ค่าเริ่มต้นนี้ใช้เป็นแนวทางสำหรับผู้เชี่ยวชาญใหม่และ workflow ในเวิร์กสเปซ">

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider เริ่มต้น">
              <select
                value={defaultProvider}
                onChange={(e) => setDefaultProvider(e.target.value)}
                disabled={!isAdmin}
                className={inputClasses}
              >
                <option value="">— ไม่กำหนด —</option>
                {providerOptions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Model เริ่มต้น">
              <input
                type="text"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                disabled={!isAdmin}
                placeholder="เช่น claude-sonnet-4-20250514"
                className={inputClasses}
              />
            </Field>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pt-2">ขีดจำกัด</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Token สูงสุดต่อการประชุม
              </label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                disabled={!isAdmin}
                min={1000}
                max={500000}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50 dark:bg-gray-950"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                ประชุมสูงสุดต่อวัน
              </label>
              <input
                type="number"
                value={maxMeetings}
                onChange={(e) => setMaxMeetings(Number(e.target.value))}
                disabled={!isAdmin}
                min={1}
                max={1000}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50 dark:bg-gray-950"
              />
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pt-2">ฟีเจอร์</h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={enableWebSearch}
                onChange={(e) => setEnableWebSearch(e.target.checked)}
                disabled={!isAdmin}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">เปิดใช้ Web Search</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={enableMcp}
                onChange={(e) => setEnableMcp(e.target.checked)}
                disabled={!isAdmin}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">เปิดใช้ MCP Integration</span>
            </label>
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saved ? "บันทึกแล้ว" : "บันทึก"}
              </Button>
            </div>
          )}
        </FormSection>
      )}

      {/* Tab: Members */}
      {tab === "members" && (
        <div className="space-y-6">
          {/* Invite */}
          {isAdmin && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                เชิญสมาชิก
              </h2>
              <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">อีเมล</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="member@example.com"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">บทบาท</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="admin">แอดมิน</option>
                    <option value="member">สมาชิก</option>
                    <option value="viewer">ผู้ดู</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  เชิญ
                </button>
              </form>
              {inviteMsg && (
                <p className="mt-3 text-sm">{inviteMsg}</p>
              )}
            </div>
          )}

          {/* Members List */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              สมาชิก ({members.length})
            </h2>
            {members.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">ไม่มีสมาชิก</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {members.map((m) => {
                  const role = roleLabels[m.role] || roleLabels.member
                  const RoleIcon = roleIcons[m.role] || UserCheck
                  return (
                    <div key={m.memberId} className="flex items-center gap-3 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <RoleIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {m.userId}
                        </p>
                        <p className="text-xs text-gray-400">
                          เข้าร่วม {new Date(m.createdAt).toLocaleDateString("th-TH")}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${role.color}`}>
                        {role.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Web Search */}
      {tab === "search" && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Web Search API Keys</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ใส่ API Key เพื่อให้ผู้เชี่ยวชาญค้นหาข้อมูลจากเว็บได้ — key จะถูกเข้ารหัส AES-256-GCM
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Serper API Key
                {detail.settings?.hasSerperKey && (
                  <span className="ml-2 text-green-600 text-xs">✅ ตั้งค่าแล้ว</span>
                )}
              </label>
              <input
                type="password"
                value={serperApiKey}
                onChange={(e) => setSerperApiKey(e.target.value)}
                disabled={!isAdmin}
                placeholder={detail.settings?.hasSerperKey ? "••••••••• (ใส่ใหม่เพื่อเปลี่ยน)" : "ใส่ Serper API Key"}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50 dark:bg-gray-950"
              />
              <p className="mt-1 text-xs text-gray-400">สมัครได้ที่ serper.dev</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                SerpApi Key
                {detail.settings?.hasSerpKey && (
                  <span className="ml-2 text-green-600 text-xs">✅ ตั้งค่าแล้ว</span>
                )}
              </label>
              <input
                type="password"
                value={serpApiKey}
                onChange={(e) => setSerpApiKey(e.target.value)}
                disabled={!isAdmin}
                placeholder={detail.settings?.hasSerpKey ? "••••••••• (ใส่ใหม่เพื่อเปลี่ยน)" : "ใส่ SerpApi Key"}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50 dark:bg-gray-950"
              />
              <p className="mt-1 text-xs text-gray-400">สมัครได้ที่ serpapi.com</p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saved ? "บันทึกแล้ว" : "บันทึก"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

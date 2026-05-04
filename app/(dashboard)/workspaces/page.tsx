"use client"

import { useEffect, useState } from "react"
import { useWorkspace } from "@/components/providers/workspace-provider"
import { authClient } from "@/lib/auth/client"
import {
  Building2, Plus, Check, Calendar, Trash2, Loader2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button, ButtonLink } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Field, inputClasses } from "@/components/ui/form-section"
import { PageHeader } from "@/components/ui/page-header"

interface WorkspaceInfo {
  id: string
  name: string
  slug: string | null
  logo: string | null
  createdAt: string | Date
  role: string
}

const roleLabels: Record<string, { label: string; color: string }> = {
  owner: { label: "เจ้าของ", color: "bg-purple-100 text-purple-700" },
  admin: { label: "แอดมิน", color: "bg-blue-100 text-blue-700 dark:text-blue-300" },
  member: { label: "สมาชิก", color: "bg-green-100 text-green-700 dark:text-green-300" },
  viewer: { label: "ผู้ดู", color: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" },
}

export default function WorkspacesPage() {
  const { activeWorkspace, switchWorkspace, refreshWorkspaces } = useWorkspace()
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  async function fetchWorkspaces() {
    setLoading(true)
    try {
      const res = await fetch("/api/workspaces")
      const json = await res.json()
      setWorkspaces(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || submitting) return
    setSubmitting(true)
    try {
      // Check limit
      const check = await fetch("/api/workspaces", { method: "POST" })
      const checkJson = await check.json()
      if (!check.ok) {
        alert(checkJson.error || "ไม่สามารถสร้างได้")
        return
      }

      const slug = newName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9ก-๙]+/g, "-")
        .replace(/^-|-$/g, "")

      await authClient.organization.create({ name: newName.trim(), slug })
      await refreshWorkspaces()
      await fetchWorkspaces()
      setNewName("")
      setCreating(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSwitch(id: string) {
    if (id === activeWorkspace?.id) return
    await switchWorkspace(id)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ต้องการลบ Workspace "${name}"? ข้อมูลทั้งหมดจะถูกลบ`)) return
    try {
      await authClient.organization.delete({ organizationId: id })
      await refreshWorkspaces()
      await fetchWorkspaces()
    } catch {
      alert("ไม่สามารถลบ Workspace นี้ได้")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="เวิร์กสเปซ"
        description="แยกข้อมูล ทีม ผู้เชี่ยวชาญ และการตั้งค่าสำหรับแต่ละองค์กร"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            สร้างเวิร์กสเปซ
          </Button>
        }
      />

      {/* Create Form */}
      {creating && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="ชื่อเวิร์กสเปซ" className="flex-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="เช่น สำนักงานบัญชี ABC"
                className={inputClasses}
                autoFocus
              />
            </Field>
            <Button
              type="submit"
              disabled={submitting || !newName.trim()}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "สร้าง"}
            </Button>
            <Button
              type="button"
              onClick={() => { setCreating(false); setNewName("") }}
              variant="secondary"
            >
              ยกเลิก
            </Button>
          </form>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        /* Empty */
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="ยังไม่มีเวิร์กสเปซ"
          description="สร้างเวิร์กสเปซแรกเพื่อเริ่มจัดทีมผู้เชี่ยวชาญ"
          action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />สร้างเวิร์กสเปซ</Button>}
        />
      ) : (
        /* Workspace Cards */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspace?.id
            const role = roleLabels[ws.role] || roleLabels.member
            return (
              <div
                key={ws.id}
                className={`relative rounded-xl border bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md ${
                  isActive ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {isActive && (
                  <div className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white">
                    <Check className="h-3 w-3" />
                    ใช้งานอยู่
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{ws.name}</h3>
                    {ws.slug && (
                      <p className="text-xs text-gray-400 truncate">{ws.slug}</p>
                    )}
                    <Badge className={role.color}>{role.label}</Badge>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(ws.createdAt).toLocaleDateString("th-TH")}
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  {!isActive && (
                    <Button
                      onClick={() => handleSwitch(ws.id)}
                      variant="soft"
                      className="flex-1"
                    >
                      สลับมาใช้
                    </Button>
                  )}
                  {isActive && (
                    <ButtonLink href="/settings" variant="secondary" className="flex-1">
                      ตั้งค่า
                    </ButtonLink>
                  )}
                  {ws.role === "owner" && !isActive && (
                    <button
                      onClick={() => handleDelete(ws.id, ws.name)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:bg-red-950 transition-colors"
                      title="ลบ Workspace"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

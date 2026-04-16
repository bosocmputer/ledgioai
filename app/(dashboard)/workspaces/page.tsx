"use client"

import { useEffect, useState } from "react"
import { useWorkspace } from "@/components/providers/workspace-provider"
import { authClient } from "@/lib/auth/client"
import {
  Building2, Plus, Check, Users, Calendar, Trash2, Loader2,
} from "lucide-react"

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Workspaces</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">จัดการ Workspace ของคุณ</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          สร้าง Workspace
        </button>
      </div>

      {/* Create Form */}
      {creating && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950 p-4">
          <form onSubmit={handleCreate} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                ชื่อ Workspace
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="เช่น สำนักงานบัญชี ABC"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !newName.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "สร้าง"}
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setNewName("") }}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-800 transition-colors"
            >
              ยกเลิก
            </button>
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
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-950 py-16">
          <Building2 className="h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">ยังไม่มี Workspace</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">สร้าง Workspace แรกเพื่อเริ่มใช้งาน</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            สร้าง Workspace
          </button>
        </div>
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
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${role.color}`}>
                      {role.label}
                    </span>
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
                    <button
                      onClick={() => handleSwitch(ws.id)}
                      className="flex-1 rounded-lg bg-blue-50 dark:bg-blue-950 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                    >
                      สลับมาใช้
                    </button>
                  )}
                  {isActive && (
                    <a
                      href="/settings"
                      className="flex-1 rounded-lg bg-gray-50 dark:bg-gray-950 px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-800 transition-colors"
                    >
                      ตั้งค่า
                    </a>
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

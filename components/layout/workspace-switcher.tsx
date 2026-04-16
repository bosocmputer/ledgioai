"use client"

import { useState, useRef, useEffect } from "react"
import { useWorkspace } from "@/components/providers/workspace-provider"
import { authClient } from "@/lib/auth/client"
import { ChevronsUpDown, Plus, Check, Loader2 } from "lucide-react"

export function WorkspaceSwitcher() {
  const { activeWorkspace, workspaces, loading, switchWorkspace, refreshWorkspaces } =
    useWorkspace()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return

    const slug = newName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙]+/g, "-")
      .replace(/^-|-$/g, "")

    await authClient.organization.create({ name: newName.trim(), slug })
    await refreshWorkspaces()
    setNewName("")
    setCreating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>กำลังโหลด...</span>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-left text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:bg-gray-950 transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
            {activeWorkspace?.name?.charAt(0)?.toUpperCase() || "W"}
          </div>
          <span className="truncate">
            {activeWorkspace?.name || "เลือก Workspace"}
          </span>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[240px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg">
          <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Workspaces
          </div>

          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={async () => {
                if (ws.id !== activeWorkspace?.id) {
                  await switchWorkspace(ws.id)
                }
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-800"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
                {ws.name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 truncate text-left">{ws.name}</span>
              {ws.id === activeWorkspace?.id && (
                <Check className="h-4 w-4 text-blue-600" />
              )}
            </button>
          ))}

          <div className="my-1 border-t border-gray-100" />

          {creating ? (
            <form onSubmit={handleCreate} className="px-2 py-1.5">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ชื่อ Workspace ใหม่"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              <div className="mt-1.5 flex gap-1">
                <button
                  type="submit"
                  className="flex-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  สร้าง
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-950"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2 px-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              <span>สร้าง Workspace ใหม่</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

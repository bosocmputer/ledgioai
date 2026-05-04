"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Users, Plus, Trash2, Pencil, Bot } from "lucide-react"
import { useWorkspace } from "@/components/providers/workspace-provider"
import { PageInfo } from "@/components/ui/page-info"
import { ButtonLink } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { SearchInput } from "@/components/ui/search-input"

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
  createdAt: string
}

export default function TeamsPage() {
  const { activeWorkspace } = useWorkspace()
  const [teams, setTeams] = useState<Team[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspace) return
    fetchTeams()
  }, [activeWorkspace])

  async function fetchTeams() {
    setLoading(true)
    try {
      const res = await fetch("/api/teams")
      const json = await res.json()
      setTeams(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("ต้องการลบทีมนี้?")) return
    const res = await fetch(`/api/teams/${id}`, { method: "DELETE" })
    if (res.ok) {
      setTeams((prev) => prev.filter((t) => t.id !== id))
    }
  }

  const filtered = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="ทีม"
        description={`จัดกลุ่มผู้เชี่ยวชาญ AI เป็นทีมที่เรียกใช้ซ้ำได้ (${teams.length} ทีม)`}
        actions={
          <ButtonLink href="/teams/new">
            <Plus className="h-4 w-4" />
            สร้างทีม
          </ButtonLink>
        }
      />

      <PageInfo id="teams">
        ทีมคือการรวม agents หลายคนไว้ด้วยกันสำหรับงานประเภทเดียวกัน เช่น <strong>"คณะที่ปรึกษาภาษี"</strong> อาจมีนักบัญชี + ที่ปรึกษา VAT + ผู้ตรวจสอบบัญชี เมื่อเข้าห้องประชุมแล้วเลือกทีม ไม่ต้องเลือก agent ทีละคนทุกครั้ง — ประหยัดเวลาเมื่อใช้งานประจำ
      </PageInfo>

      <SearchInput
        placeholder="ค้นหาชื่อหรือคำอธิบายทีม..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
      />

      {/* Team Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title={teams.length === 0 ? "ยังไม่มีทีม" : "ไม่พบผลลัพธ์"}
          description={teams.length === 0 ? "สร้างทีมแรกเพื่อเรียกผู้เชี่ยวชาญหลายคนเข้าประชุมได้เร็วขึ้น" : "ลองค้นหาด้วยชื่อหรือคำอธิบายอื่น"}
          action={
            teams.length === 0 ? (
              <ButtonLink href="/teams/new">
                <Plus className="h-4 w-4" />
                สร้างทีม
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((team) => (
            <div
              key={team.id}
              className="group relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 transition-shadow hover:shadow-md"
            >
              {/* Actions */}
              <div className="absolute right-3 top-3 flex gap-1 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100">
                <Link
                  href={`/teams/${team.id}`}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDelete(team.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <Link href={`/teams/${team.id}`} className="block">
                {/* Team info */}
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950 text-2xl">
                    {team.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-gray-900 dark:text-gray-100">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                        {team.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Agents */}
                <div className="mt-4">
                  {team.agents.length === 0 ? (
                    <p className="text-xs text-gray-400">ยังไม่มีสมาชิก</p>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Bot className="mr-1 h-3.5 w-3.5 text-gray-400" />
                      <div className="flex -space-x-2">
                        {team.agents.slice(0, 5).map((agent) => (
                          <div
                            key={agent.id}
                            title={agent.name}
                            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-100 dark:bg-gray-800 text-sm"
                          >
                            {agent.emoji}
                          </div>
                        ))}
                      </div>
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        {team.agents.length} คน
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

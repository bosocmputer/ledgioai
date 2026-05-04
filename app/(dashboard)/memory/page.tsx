"use client"

import { useEffect, useState, useCallback } from "react"
import { useWorkspace } from "@/components/providers/workspace-provider"
import {
  Brain,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Filter,
  AlertTriangle,
} from "lucide-react"
import { PageInfo } from "@/components/ui/page-info"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { SearchInput } from "@/components/ui/search-input"

// ── Types ──────────────────────────────────────────────

interface MemoryFact {
  id: string
  key: string
  value: string
  category: string | null
  source: string | null
  confidence: number
  createdAt: string
  updatedAt: string
}

interface CategoryCount {
  category: string | null
  count: number
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  tax: { label: "ภาษี", emoji: "🧾", color: "bg-red-100 text-red-700 dark:text-red-300" },
  company: { label: "บริษัท", emoji: "🏢", color: "bg-blue-100 text-blue-700 dark:text-blue-300" },
  employee: { label: "พนักงาน", emoji: "👥", color: "bg-green-100 text-green-700 dark:text-green-300" },
  accounting: { label: "บัญชี", emoji: "📊", color: "bg-purple-100 text-purple-700" },
  legal: { label: "กฎหมาย", emoji: "⚖️", color: "bg-amber-100 text-amber-700 dark:text-amber-300" },
  other: { label: "อื่นๆ", emoji: "📌", color: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" },
}

// ── Main Component ─────────────────────────────────────

export default function MemoryPage() {
  const { activeWorkspace } = useWorkspace()

  const [facts, setFacts] = useState<MemoryFact[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<CategoryCount[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [newCategory, setNewCategory] = useState("other")

  // Edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editCategory, setEditCategory] = useState("")

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showDeleteAll, setShowDeleteAll] = useState(false)

  // ── Fetch ──────────────────────────────────────────
  const fetchFacts = useCallback(async () => {
    if (!activeWorkspace) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory) params.set("category", selectedCategory)
      if (search.trim()) params.set("search", search.trim())
      const qs = params.toString()

      const res = await fetch(`/api/memory${qs ? `?${qs}` : ""}`)
      const json = await res.json()
      setFacts(json.data ?? [])
      setTotal(json.total ?? 0)
      setCategories(json.categories ?? [])
    } finally {
      setLoading(false)
    }
  }, [activeWorkspace, selectedCategory, search])

  useEffect(() => {
    fetchFacts()
  }, [fetchFacts])

  // Debounced search
  const [searchDebounce, setSearchDebounce] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchDebounce), 300)
    return () => clearTimeout(timer)
  }, [searchDebounce])

  // ── Create ─────────────────────────────────────────
  async function handleCreate() {
    if (!newKey.trim() || !newValue.trim()) return
    await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: newKey.trim(), value: newValue.trim(), category: newCategory }),
    })
    setShowCreate(false)
    setNewKey("")
    setNewValue("")
    setNewCategory("other")
    fetchFacts()
  }

  // ── Update ─────────────────────────────────────────
  async function handleUpdate(id: string) {
    await fetch(`/api/memory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: editValue, category: editCategory }),
    })
    setEditId(null)
    fetchFacts()
  }

  // ── Delete ─────────────────────────────────────────
  async function handleDelete(id: string) {
    await fetch(`/api/memory/${id}`, { method: "DELETE" })
    setDeleteId(null)
    fetchFacts()
  }

  async function handleDeleteAll() {
    await fetch("/api/memory", { method: "DELETE" })
    setShowDeleteAll(false)
    fetchFacts()
  }

  // ── Category helper ────────────────────────────────
  function catInfo(cat: string | null) {
    return CATEGORY_LABELS[cat ?? "other"] ?? CATEGORY_LABELS.other
  }

  // ── Render ─────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="ความจำ"
        icon={<Brain className="h-6 w-6" />}
        description={`ข้อเท็จจริงที่ AI จดจำเกี่ยวกับเวิร์กสเปซนี้ (${total} รายการ)`}
        actions={
          <>
          {facts.length > 0 && (
            <Button
              onClick={() => setShowDeleteAll(true)}
              variant="ghost"
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              ล้างทั้งหมด
            </Button>
          )}
          <Button
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4" /> เพิ่มข้อเท็จจริง
          </Button>
          </>
        }
      />

      <PageInfo id="memory">
        Memory เก็บข้อมูลที่ agent ควรรู้เกี่ยวกับบริษัทของคุณอยู่เสมอ เช่น "จดทะเบียน VAT แล้ว", "งวดบัญชีสิ้นสุด ธ.ค.", "ใช้มาตรฐาน NPAEs" — ทุกครั้งที่ประชุม ข้อมูลเหล่านี้จะถูกส่งให้ agent อ่านอัตโนมัติ ไม่ต้องอธิบายซ้ำทุกครั้ง ระบบดึง memory มาจากการประชุม Full Board โดยอัตโนมัติ หรือจะเพิ่มเองก็ได้
      </PageInfo>

      {/* Filters */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <SearchInput
          className="max-w-sm"
          value={searchDebounce}
          onChange={(e) => setSearchDebounce(e.target.value)}
          onClear={() => setSearchDebounce("")}
          placeholder="ค้นหาความจำ..."
        />

        {/* Category filter */}
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              !selectedCategory ? "bg-blue-100 text-blue-700 dark:text-blue-300" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700"
            }`}
          >
            ทั้งหมด
          </button>
          {categories.map((cat) => {
            const info = catInfo(cat.category)
            return (
              <button
                key={cat.category ?? "null"}
                onClick={() => setSelectedCategory(cat.category ?? "other")}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  selectedCategory === (cat.category ?? "other")
                    ? `${info.color}`
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700"
                }`}
              >
                {info.emoji} {info.label} ({cat.count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Facts List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : facts.length === 0 ? (
        <EmptyState
          icon={<Brain className="h-16 w-16" />}
          title="ยังไม่มีข้อมูลที่จดจำ"
          description="AI จะเรียนรู้จากการประชุม หรือคุณสามารถเพิ่มข้อเท็จจริงที่ยืนยันแล้วเองได้"
          action={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> เพิ่มข้อเท็จจริงแรก</Button>}
        />
      ) : (
        <div className="space-y-2">
          {facts.map((fact) => {
            const info = catInfo(fact.category)
            const isEditing = editId === fact.id

            return (
              <div
                key={fact.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:border-gray-600 transition-colors"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{fact.key}</span>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="text-xs border rounded px-2 py-1"
                      >
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.emoji} {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(fact.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> บันทึก
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-sm hover:bg-gray-200 dark:bg-gray-700"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300">{fact.key}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${info.color}`}>
                          {info.emoji} {info.label}
                        </span>
                        {fact.source && (
                          <span className="text-xs text-gray-400">
                            {fact.source === "meeting" ? "🤖 จากการประชุม" : "✍️ เพิ่มเอง"}
                          </span>
                        )}
                        {fact.confidence < 80 && (
                          <span className="text-xs text-amber-500">
                            ⚠️ ความมั่นใจ {fact.confidence}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800">{fact.value}</p>
                      <span className="text-xs text-gray-400 mt-1 block">
                        อัปเดต: {new Date(fact.updatedAt).toLocaleString("th-TH")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditId(fact.id)
                          setEditValue(fact.value)
                          setEditCategory(fact.category ?? "other")
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:bg-blue-950 rounded"
                        title="แก้ไข"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(fact.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:bg-red-950 rounded"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">เพิ่มข้อเท็จจริง</h2>
              <button onClick={() => setShowCreate(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key (snake_case)</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="เช่น vat_status, company_type"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</label>
                <textarea
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="ข้อเท็จจริงที่ต้องการจดจำ"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หมวดหมู่</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.emoji} {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreate}
                disabled={!newKey.trim() || !newValue.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h2 className="text-lg font-semibold">ยืนยันการลบ</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">ข้อเท็จจริงนี้จะถูกลบถาวร</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete All Confirm ── */}
      {showDeleteAll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h2 className="text-lg font-semibold">ล้างข้อมูลทั้งหมด</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              ข้อเท็จจริงทั้งหมด {total} รายการจะถูกลบถาวร<br />
              AI จะลืมทุกอย่างเกี่ยวกับ workspace นี้
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteAll(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                ลบทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

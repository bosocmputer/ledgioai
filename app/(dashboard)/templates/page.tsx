"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LayoutTemplate, Search, ArrowRight } from "lucide-react"

interface Template {
  id: string
  name: string
  emoji: string
  role: string
  description: string | null
  category: string | null
  suggestedProvider: string | null
  suggestedModel: string | null
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/agent-templates")
      .then((r) => r.json())
      .then((json) => setTemplates(json.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.role.toLowerCase().includes(search.toLowerCase()) ||
      (t.category ?? "").toLowerCase().includes(search.toLowerCase())
  )

  // Group by category
  const categories = new Map<string, Template[]>()
  for (const tpl of filtered) {
    const cat = tpl.category ?? "อื่นๆ"
    const arr = categories.get(cat) ?? []
    arr.push(tpl)
    categories.set(cat, arr)
  }

  function handleUseTemplate(tplId: string) {
    // Navigate to new agent page — template will be loaded there
    router.push(`/agents/new?template=${tplId}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">เทมเพลต Agent</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          เลือก template เพื่อสร้าง Agent อย่างรวดเร็ว
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหาเทมเพลต..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 py-12 text-center">
          <LayoutTemplate className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-sm font-medium text-gray-900 dark:text-gray-100">
            ไม่พบเทมเพลต
          </h3>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(categories.entries()).map(([category, tpls]) => (
            <div key={category}>
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {category}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tpls.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950 text-2xl">
                        {tpl.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {tpl.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{tpl.role}</p>
                      </div>
                    </div>

                    {tpl.description && (
                      <p className="mt-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                        {tpl.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex gap-2">
                        {tpl.suggestedProvider && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                            {tpl.suggestedProvider}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleUseTemplate(tpl.id)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300"
                      >
                        ใช้เทมเพลต
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

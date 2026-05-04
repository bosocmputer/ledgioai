"use client"

import { useState, useEffect } from "react"
import { X, Info } from "lucide-react"

interface PageInfoProps {
  id: string           // unique key for localStorage — e.g. "agents", "meeting"
  children: React.ReactNode
}

/**
 * Collapsible info banner shown below page header.
 * User can dismiss per-page — preference persists in localStorage.
 */
export function PageInfo({ id, children }: PageInfoProps) {
  const storageKey = `ledgio:info-dismissed:${id}`
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey)
    if (!dismissed) setVisible(true)
  }, [storageKey])

  function dismiss() {
    localStorage.setItem(storageKey, "1")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-900 dark:text-blue-200">
      <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
      <div className="flex-1 leading-relaxed">{children}</div>
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-blue-300 hover:text-blue-500 dark:text-blue-600 dark:hover:text-blue-400 transition-colors"
        aria-label="ปิด"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

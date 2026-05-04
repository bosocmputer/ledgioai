import type { ReactNode } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  href?: string
  toneClassName?: string
  helper?: string
}

export function MetricCard({ label, value, icon, href, toneClassName, helper }: MetricCardProps) {
  const content = (
    <>
      {icon && (
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
            toneClassName,
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-0.5 truncate text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        {helper && <p className="mt-0.5 text-xs text-gray-400">{helper}</p>}
      </div>
    </>
  )

  const classes =
    "flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-colors dark:border-gray-700 dark:bg-gray-900"

  if (href) {
    return (
      <Link href={href} className={cn(classes, "hover:border-blue-200 hover:shadow-sm dark:hover:border-blue-900")}>
        {content}
      </Link>
    )
  }

  return <div className={classes}>{content}</div>
}

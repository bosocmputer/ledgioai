import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface FormSectionProps {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
  actions?: ReactNode
  className?: string
}

export function FormSection({
  title,
  description,
  icon,
  children,
  actions,
  className,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900 sm:p-6",
        className,
      )}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon && <div className="text-gray-500 dark:text-gray-400">{icon}</div>}
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          </div>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

interface FieldProps {
  label: string
  description?: string
  children: ReactNode
  className?: string
}

export function Field({ label, description, children, className }: FieldProps) {
  return (
    <label className={cn("block", className)}>
      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {description && (
        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{description}</span>
      )}
      <div className="mt-1">{children}</div>
    </label>
  )
}

export const inputClasses =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100 dark:disabled:bg-gray-900 dark:[color-scheme:dark]"

export const textareaClasses =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100 dark:disabled:bg-gray-900 dark:[color-scheme:dark]"

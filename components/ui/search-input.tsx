"use client"

import type { InputHTMLAttributes } from "react"
import { Search, X } from "lucide-react"

import { cn } from "@/lib/utils"

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  onClear?: () => void
}

export function SearchInput({ className, value, onClear, ...props }: SearchInputProps) {
  const hasValue = typeof value === "string" && value.length > 0

  return (
    <div className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={value}
        className="h-10 w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-9 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-blue-950"
        {...props}
      />
      {hasValue && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 rounded-md p-1 text-gray-400 transition-colors -translate-y-1/2 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          aria-label="ล้างการค้นหา"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

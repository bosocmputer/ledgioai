"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher"
import { UserMenu } from "@/components/layout/user-menu"
import { useTheme } from "@/components/providers/theme-provider"
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Users,
  LayoutTemplate,
  History,
  Brain,
  BarChart3,
  Building2,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
} from "lucide-react"
import { useState, useEffect } from "react"

const navItems = [
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/meeting", label: "ห้องประชุม", icon: MessageSquare },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/teams", label: "ทีม", icon: Users },
  { href: "/templates", label: "เทมเพลต", icon: LayoutTemplate },
  { href: "/history", label: "ประวัติ", icon: History },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/insights", label: "Insight", icon: BarChart3 },
  { href: "/workspaces", label: "Workspace", icon: Building2 },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const themeOptions = [
    { value: "light" as const, icon: Sun, label: "สว่าง" },
    { value: "dark" as const, icon: Moon, label: "มืด" },
    { value: "system" as const, icon: Monitor, label: "ระบบ" },
  ]

  return (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          L
        </div>
        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">LEDGIO AI</span>
      </div>

      {/* Workspace Switcher */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-3">
        <WorkspaceSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active ? "text-blue-600 dark:text-blue-400" : "text-gray-400")} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
        <div className="flex items-center justify-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          {themeOptions.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                title={opt.label}
                className={cn(
                  "flex-1 rounded-md p-1.5 transition-colors flex items-center justify-center",
                  theme === opt.value
                    ? "bg-white shadow-sm text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            )
          })}
        </div>
      </div>

      {/* User Menu */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <UserMenu />
      </div>
    </>
  )
}

// ── Mobile Top Bar ─────────────────────────────────────

export function MobileHeader({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex h-14 items-center gap-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 lg:hidden">
      <button
        onClick={onOpen}
        className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
        L
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">LEDGIO AI</span>
    </div>
  )
}

// ── Main Sidebar (desktop + mobile drawer) ─────────────

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile drawer on navigation
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-full w-64 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 flex flex-col bg-white dark:bg-gray-900 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Mobile header trigger */}
      <MobileHeader onOpen={() => setOpen(true)} />
    </>
  )
}

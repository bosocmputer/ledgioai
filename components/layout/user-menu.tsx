"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authClient, useSession } from "@/lib/auth/client"
import { LogOut, Settings, User as UserIcon } from "lucide-react"

export function UserMenu() {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/login")
  }

  const user = session?.user

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-gray-100 dark:bg-gray-800 transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400">
          {user?.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            user?.name?.charAt(0)?.toUpperCase() || <UserIcon className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 truncate">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {user?.name || "ผู้ใช้"}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
        </div>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-full min-w-[200px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg">
          <button
            onClick={() => {
              setOpen(false)
              router.push("/settings")
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-800"
          >
            <Settings className="h-4 w-4" />
            <span>ตั้งค่าบัญชี</span>
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:bg-red-950"
          >
            <LogOut className="h-4 w-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      )}
    </div>
  )
}

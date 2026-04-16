"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authClient, useSession } from "@/lib/auth/client"
import { useWorkspace } from "@/components/providers/workspace-provider"

/**
 * Ensures user has an active workspace.
 * If no workspaces exist, auto-creates one.
 * If workspaces exist but none is active, sets the first as active.
 */
export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: sessionLoading } = useSession()
  const { activeWorkspace, workspaces, loading: wsLoading } = useWorkspace()
  const [initializing, setInitializing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (sessionLoading || wsLoading || initializing) return
    if (!session?.user) return

    async function ensureWorkspace() {
      setInitializing(true)
      try {
        if (workspaces.length === 0) {
          // No workspaces — create default
          const name = session!.user.name || "My"
          const slug = (session!.user.email || "user")
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")

          await authClient.organization.create({
            name: `${name} Workspace`,
            slug,
          })

          // Set as active and reload
          const orgs = await authClient.organization.list()
          if (orgs.data && orgs.data.length > 0) {
            await authClient.organization.setActive({
              organizationId: (orgs.data[0] as { id: string }).id,
            })
          }
          window.location.reload()
          return
        }

        if (!activeWorkspace && workspaces.length > 0) {
          // Has workspaces but none active — activate first
          await authClient.organization.setActive({
            organizationId: workspaces[0].id,
          })
          window.location.reload()
          return
        }
      } catch {
        // Silently fail — user can still interact
      } finally {
        setInitializing(false)
      }
    }

    ensureWorkspace()
  }, [sessionLoading, wsLoading, session, activeWorkspace, workspaces, initializing, router])

  if (sessionLoading || wsLoading || initializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">กำลังเตรียม Workspace...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

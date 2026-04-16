"use client"

import { createContext, useContext, useCallback, useEffect, useState } from "react"
import { authClient } from "@/lib/auth/client"

interface Workspace {
  id: string
  name: string
  slug: string | null
  logo: string | null
  createdAt: Date
}

interface WorkspaceContextValue {
  activeWorkspace: Workspace | null
  workspaces: Workspace[]
  loading: boolean
  switchWorkspace: (workspaceId: string) => Promise<void>
  refreshWorkspaces: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  activeWorkspace: null,
  workspaces: [],
  loading: true,
  switchWorkspace: async () => {},
  refreshWorkspaces: async () => {},
})

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshWorkspaces = useCallback(async () => {
    try {
      const result = await authClient.organization.list()
      if (result.data) {
        setWorkspaces(result.data as Workspace[])
      }
    } catch {
      // Silently fail — will show empty state
    }
  }, [])

  const loadActiveWorkspace = useCallback(async () => {
    try {
      const result = await authClient.useActiveOrganization
        ? await authClient.organization.getFullOrganization()
        : null
      if (result?.data) {
        setActiveWorkspace(result.data as unknown as Workspace)
      }
    } catch {
      // No active workspace set yet
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([refreshWorkspaces(), loadActiveWorkspace()])
      setLoading(false)
    }
    init()
  }, [refreshWorkspaces, loadActiveWorkspace])

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      try {
        await authClient.organization.setActive({ organizationId: workspaceId })
        const ws = workspaces.find((w) => w.id === workspaceId)
        if (ws) setActiveWorkspace(ws)
        // Reload to refresh all data with new workspace context
        window.location.reload()
      } catch {
        throw new Error("ไม่สามารถสลับ Workspace ได้")
      }
    },
    [workspaces]
  )

  return (
    <WorkspaceContext.Provider
      value={{ activeWorkspace, workspaces, loading, switchWorkspace, refreshWorkspaces }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}

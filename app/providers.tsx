"use client"

import { WorkspaceProvider } from "@/components/providers/workspace-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { ServiceWorkerRegister } from "@/components/pwa/sw-register"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        {children}
        <ServiceWorkerRegister />
      </WorkspaceProvider>
    </ThemeProvider>
  )
}

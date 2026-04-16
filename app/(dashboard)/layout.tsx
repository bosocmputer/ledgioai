import { Sidebar } from "@/components/layout/sidebar"
import { WorkspaceGuard } from "@/components/providers/workspace-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkspaceGuard>
      <div className="flex h-screen flex-col lg:flex-row overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 lg:p-6 min-w-0">{children}</main>
      </div>
    </WorkspaceGuard>
  )
}

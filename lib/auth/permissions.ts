import { auth } from "@/lib/auth"

export type Permission =
  | "agent:create" | "agent:read" | "agent:update" | "agent:delete"
  | "team:create" | "team:read" | "team:update" | "team:delete"
  | "meeting:start" | "meeting:read"
  | "memory:read" | "memory:update" | "memory:delete"
  | "settings:read" | "settings:update"
  | "member:invite" | "member:read"

// Role → allowed permissions map
const rolePermissions: Record<string, Permission[]> = {
  owner: [
    "agent:create", "agent:read", "agent:update", "agent:delete",
    "team:create", "team:read", "team:update", "team:delete",
    "meeting:start", "meeting:read",
    "memory:read", "memory:update", "memory:delete",
    "settings:read", "settings:update",
    "member:invite", "member:read",
  ],
  admin: [
    "agent:create", "agent:read", "agent:update", "agent:delete",
    "team:create", "team:read", "team:update", "team:delete",
    "meeting:start", "meeting:read",
    "memory:read", "memory:update", "memory:delete",
    "settings:read", "settings:update",
    "member:invite", "member:read",
  ],
  member: [
    "agent:create", "agent:read", "agent:update",
    "team:read",
    "meeting:start", "meeting:read",
    "memory:read", "memory:update",
    "settings:read",
    "member:read",
  ],
  viewer: [
    "agent:read",
    "team:read",
    "meeting:read",
    "memory:read",
    "settings:read",
    "member:read",
  ],
}

export function hasPermission(role: string, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

interface AuthContext {
  workspaceId: string
  userId: string
  role: string
}

/**
 * Require authentication and active workspace.
 * Returns auth context or a Response error.
 */
export async function requireAuth(
  request: Request
): Promise<AuthContext | Response> {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // activeOrganizationId is added by the organization plugin
  const workspaceId = (session.session as Record<string, unknown>).activeOrganizationId as string | undefined
  if (!workspaceId) {
    return Response.json({ error: "No active workspace" }, { status: 400 })
  }

  // Get user's role in this workspace via DB query
  const { getUserWorkspaceRole } = await import("@/lib/db/queries/workspaces")
  const role = await getUserWorkspaceRole(session.user.id, workspaceId) ?? "member"

  return { workspaceId, userId: session.user.id, role }
}

/**
 * Require authentication + specific permission.
 * Returns auth context or a Response error.
 */
export async function requirePermission(
  request: Request,
  permission: Permission
): Promise<AuthContext | Response> {
  const result = await requireAuth(request)
  if (result instanceof Response) return result

  if (!hasPermission(result.role, permission)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  return result
}

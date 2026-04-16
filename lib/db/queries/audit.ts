/**
 * Audit Logs — DB Queries
 * Log who did what when, scoped by workspace.
 */

import { db } from "@/lib/db"
import { auditLogs } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"

export interface AuditLogInput {
  workspaceId: string
  userId: string
  action: string       // e.g. "agent.create", "meeting.start"
  resource: string     // e.g. "agent", "team"
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Write an audit log entry. Fire-and-forget — never blocks the response.
 */
export function logAudit(input: AuditLogInput) {
  // Intentionally not awaited — audit logs should not slow down requests
  db.insert(auditLogs)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      details: input.details ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    })
    .catch(() => {
      // Silently fail — audit logs should never crash the app
    })
}

/**
 * Get audit logs for a workspace (paginated, newest first).
 */
export async function getAuditLogs(
  workspaceId: string,
  opts?: { limit?: number; offset?: number },
) {
  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0

  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.workspaceId, workspaceId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset)
}

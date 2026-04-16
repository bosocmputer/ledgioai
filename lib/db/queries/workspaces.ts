import { db } from "@/lib/db"
import { organization, member } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function listUserWorkspaces(userId: string) {
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      createdAt: organization.createdAt,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))

  return rows
}

export async function getWorkspaceById(workspaceId: string) {
  const [ws] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, workspaceId))
    .limit(1)

  return ws ?? null
}

export async function getUserWorkspaceRole(userId: string, workspaceId: string) {
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, workspaceId)))
    .limit(1)

  return row?.role ?? null
}

export async function countUserWorkspaces(userId: string) {
  const rows = await db
    .select({ id: member.id })
    .from(member)
    .where(eq(member.userId, userId))

  return rows.length
}

export async function getWorkspaceMembers(workspaceId: string) {
  const rows = await db
    .select({
      memberId: member.id,
      userId: member.userId,
      role: member.role,
      createdAt: member.createdAt,
    })
    .from(member)
    .where(eq(member.organizationId, workspaceId))

  return rows
}

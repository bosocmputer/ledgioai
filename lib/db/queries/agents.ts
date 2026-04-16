import { db } from "@/lib/db"
import { agents } from "@/lib/db/schema"
import { eq, and, isNull, desc, like, SQL } from "drizzle-orm"

export async function getAgentsByWorkspace(workspaceId: string) {
  return db
    .select()
    .from(agents)
    .where(and(eq(agents.workspaceId, workspaceId), isNull(agents.deletedAt)))
    .orderBy(desc(agents.createdAt))
}

export async function getAgentById(agentId: string, workspaceId: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(
      and(
        eq(agents.id, agentId),
        eq(agents.workspaceId, workspaceId),
        isNull(agents.deletedAt)
      )
    )
    .limit(1)

  return agent ?? null
}

export async function createAgent(
  data: typeof agents.$inferInsert
) {
  const [agent] = await db.insert(agents).values(data).returning()
  return agent
}

export async function updateAgent(
  agentId: string,
  workspaceId: string,
  data: Partial<Omit<typeof agents.$inferInsert, "id" | "workspaceId">>
) {
  const [agent] = await db
    .update(agents)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(agents.id, agentId),
        eq(agents.workspaceId, workspaceId),
        isNull(agents.deletedAt)
      )
    )
    .returning()

  return agent ?? null
}

export async function softDeleteAgent(agentId: string, workspaceId: string) {
  const [agent] = await db
    .update(agents)
    .set({ deletedAt: new Date(), isActive: false })
    .where(
      and(
        eq(agents.id, agentId),
        eq(agents.workspaceId, workspaceId),
        isNull(agents.deletedAt)
      )
    )
    .returning()

  return agent ?? null
}

export async function countAgentsByWorkspace(workspaceId: string) {
  const rows = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.workspaceId, workspaceId), isNull(agents.deletedAt)))

  return rows.length
}

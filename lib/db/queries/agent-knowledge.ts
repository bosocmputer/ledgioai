import { db } from "@/lib/db"
import { agentKnowledge } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function getKnowledgeByAgent(agentId: string, workspaceId: string) {
  return db
    .select()
    .from(agentKnowledge)
    .where(
      and(
        eq(agentKnowledge.agentId, agentId),
        eq(agentKnowledge.workspaceId, workspaceId)
      )
    )
}

export async function createKnowledge(
  data: typeof agentKnowledge.$inferInsert
) {
  const [row] = await db.insert(agentKnowledge).values(data).returning()
  return row
}

export async function deleteKnowledge(
  knowledgeId: string,
  workspaceId: string
) {
  const [row] = await db
    .delete(agentKnowledge)
    .where(
      and(
        eq(agentKnowledge.id, knowledgeId),
        eq(agentKnowledge.workspaceId, workspaceId)
      )
    )
    .returning()

  return row ?? null
}

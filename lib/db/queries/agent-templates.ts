import { db } from "@/lib/db"
import { agentTemplates } from "@/lib/db/schema"
import { eq, or, isNull, desc } from "drizzle-orm"

export async function getTemplates(workspaceId: string) {
  return db
    .select()
    .from(agentTemplates)
    .where(
      or(
        isNull(agentTemplates.workspaceId),        // system templates
        eq(agentTemplates.workspaceId, workspaceId) // workspace templates
      )
    )
    .orderBy(desc(agentTemplates.createdAt))
}

export async function getTemplateById(templateId: string) {
  const [tpl] = await db
    .select()
    .from(agentTemplates)
    .where(eq(agentTemplates.id, templateId))
    .limit(1)

  return tpl ?? null
}

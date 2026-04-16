import { db } from "@/lib/db"
import { workspaceSettings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function getWorkspaceSettings(workspaceId: string) {
  const [settings] = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)

  return settings ?? null
}

export async function upsertWorkspaceSettings(
  workspaceId: string,
  data: Partial<typeof workspaceSettings.$inferInsert>
) {
  const existing = await getWorkspaceSettings(workspaceId)

  if (existing) {
    const [updated] = await db
      .update(workspaceSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workspaceSettings.workspaceId, workspaceId))
      .returning()
    return updated
  }

  const [created] = await db
    .insert(workspaceSettings)
    .values({ workspaceId, ...data })
    .returning()
  return created
}

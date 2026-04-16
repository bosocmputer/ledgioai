import { db } from "@/lib/db"
import { teams, teamAgents, agents } from "@/lib/db/schema"
import { eq, and, isNull, desc, inArray } from "drizzle-orm"

export async function getTeamsByWorkspace(workspaceId: string) {
  const teamRows = await db
    .select()
    .from(teams)
    .where(and(eq(teams.workspaceId, workspaceId), isNull(teams.deletedAt)))
    .orderBy(desc(teams.createdAt))

  if (teamRows.length === 0) return []

  // Load agents for each team
  const teamIds = teamRows.map((t) => t.id)
  const taRows = await db
    .select({
      teamId: teamAgents.teamId,
      agentId: teamAgents.agentId,
      agent: agents,
    })
    .from(teamAgents)
    .innerJoin(agents, eq(teamAgents.agentId, agents.id))
    .where(and(inArray(teamAgents.teamId, teamIds), isNull(agents.deletedAt)))

  const agentsByTeam = new Map<string, typeof taRows>()
  for (const row of taRows) {
    const arr = agentsByTeam.get(row.teamId) ?? []
    arr.push(row)
    agentsByTeam.set(row.teamId, arr)
  }

  return teamRows.map((team) => ({
    ...team,
    agents: (agentsByTeam.get(team.id) ?? []).map((r) => r.agent),
  }))
}

export async function getTeamById(teamId: string, workspaceId: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.id, teamId),
        eq(teams.workspaceId, workspaceId),
        isNull(teams.deletedAt)
      )
    )
    .limit(1)

  if (!team) return null

  const taRows = await db
    .select({ agent: agents })
    .from(teamAgents)
    .innerJoin(agents, eq(teamAgents.agentId, agents.id))
    .where(and(eq(teamAgents.teamId, teamId), isNull(agents.deletedAt)))

  return { ...team, agents: taRows.map((r) => r.agent) }
}

export async function createTeam(
  data: typeof teams.$inferInsert,
  agentIds: string[]
) {
  return db.transaction(async (tx) => {
    const [team] = await tx.insert(teams).values(data).returning()

    if (agentIds.length > 0) {
      await tx.insert(teamAgents).values(
        agentIds.map((agentId) => ({ teamId: team.id, agentId }))
      )
    }

    return team
  })
}

export async function updateTeam(
  teamId: string,
  workspaceId: string,
  data: Partial<Omit<typeof teams.$inferInsert, "id" | "workspaceId">>,
  agentIds?: string[]
) {
  return db.transaction(async (tx) => {
    const [team] = await tx
      .update(teams)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(teams.id, teamId),
          eq(teams.workspaceId, workspaceId),
          isNull(teams.deletedAt)
        )
      )
      .returning()

    if (!team) return null

    if (agentIds !== undefined) {
      // Replace all agents
      await tx.delete(teamAgents).where(eq(teamAgents.teamId, teamId))
      if (agentIds.length > 0) {
        await tx.insert(teamAgents).values(
          agentIds.map((agentId) => ({ teamId: team.id, agentId }))
        )
      }
    }

    return team
  })
}

export async function softDeleteTeam(teamId: string, workspaceId: string) {
  const [team] = await db
    .update(teams)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(teams.id, teamId),
        eq(teams.workspaceId, workspaceId),
        isNull(teams.deletedAt)
      )
    )
    .returning()

  return team ?? null
}

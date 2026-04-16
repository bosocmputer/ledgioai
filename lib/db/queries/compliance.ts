/**
 * PDPA Compliance Queries
 * - Export all workspace data (right to access)
 * - Delete all workspace data (right to be forgotten)
 */

import { db } from "@/lib/db"
import {
  agents, teams, teamAgents, meetings, meetingMessages,
  memoryFacts, agentKnowledge, agentStats,
} from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/**
 * Export all data belonging to a workspace for PDPA data access request.
 * Returns sanitized data (no encrypted keys).
 */
export async function exportWorkspaceData(workspaceId: string) {
  const [
    agentList,
    teamList,
    meetingList,
    messageList,
    memoryList,
    knowledgeList,
    statsList,
  ] = await Promise.all([
    db.select({
      id: agents.id, name: agents.name, emoji: agents.emoji,
      role: agents.role, provider: agents.provider, model: agents.model,
      seniority: agents.seniority, isActive: agents.isActive,
      createdAt: agents.createdAt,
    }).from(agents).where(eq(agents.workspaceId, workspaceId)),

    db.select().from(teams).where(eq(teams.workspaceId, workspaceId)),

    db.select({
      id: meetings.id, question: meetings.question, mode: meetings.mode,
      status: meetings.status, totalTokens: meetings.totalTokens,
      startedAt: meetings.startedAt, completedAt: meetings.completedAt,
    }).from(meetings).where(eq(meetings.workspaceId, workspaceId)),

    db.select({
      id: meetingMessages.id, meetingId: meetingMessages.meetingId,
      agentName: meetingMessages.agentName, phase: meetingMessages.phase,
      content: meetingMessages.content, tokensUsed: meetingMessages.tokensUsed,
      timestamp: meetingMessages.timestamp,
    }).from(meetingMessages).where(eq(meetingMessages.workspaceId, workspaceId)),

    db.select().from(memoryFacts).where(eq(memoryFacts.workspaceId, workspaceId)),

    db.select({
      id: agentKnowledge.id, agentId: agentKnowledge.agentId,
      filename: agentKnowledge.filename, mimeType: agentKnowledge.mimeType,
      tokens: agentKnowledge.tokens, uploadedAt: agentKnowledge.uploadedAt,
    }).from(agentKnowledge).where(eq(agentKnowledge.workspaceId, workspaceId)),

    db.select().from(agentStats).where(eq(agentStats.workspaceId, workspaceId)),
  ])

  return {
    exportedAt: new Date().toISOString(),
    workspaceId,
    agents: agentList,
    teams: teamList,
    meetings: meetingList,
    messages: messageList,
    memoryFacts: memoryList,
    knowledge: knowledgeList,
    stats: statsList,
  }
}

/**
 * Delete all business data for a workspace (right to be forgotten).
 * Auth/org data is handled separately by Better Auth.
 * Uses transaction for atomicity.
 */
export async function deleteWorkspaceData(workspaceId: string) {
  return db.transaction(async (tx) => {
    // Order matters due to foreign keys
    const deletedMessages = await tx.delete(meetingMessages)
      .where(eq(meetingMessages.workspaceId, workspaceId))
      .returning({ id: meetingMessages.id })
    const deletedMeetings = await tx.delete(meetings)
      .where(eq(meetings.workspaceId, workspaceId))
      .returning({ id: meetings.id })
    const deletedStats = await tx.delete(agentStats)
      .where(eq(agentStats.workspaceId, workspaceId))
      .returning({ id: agentStats.id })
    const deletedKnowledge = await tx.delete(agentKnowledge)
      .where(eq(agentKnowledge.workspaceId, workspaceId))
      .returning({ id: agentKnowledge.id })
    const deletedMemory = await tx.delete(memoryFacts)
      .where(eq(memoryFacts.workspaceId, workspaceId))
      .returning({ id: memoryFacts.id })

    // Delete team-agent associations for workspace teams
    const workspaceTeams = await tx.select({ id: teams.id })
      .from(teams).where(eq(teams.workspaceId, workspaceId))
    for (const t of workspaceTeams) {
      await tx.delete(teamAgents).where(eq(teamAgents.teamId, t.id))
    }

    const deletedTeams = await tx.delete(teams)
      .where(eq(teams.workspaceId, workspaceId))
      .returning({ id: teams.id })
    const deletedAgents = await tx.delete(agents)
      .where(eq(agents.workspaceId, workspaceId))
      .returning({ id: agents.id })

    return {
      agents: deletedAgents.length,
      teams: deletedTeams.length,
      meetings: deletedMeetings.length,
      messages: deletedMessages.length,
      memoryFacts: deletedMemory.length,
      knowledge: deletedKnowledge.length,
      stats: deletedStats.length,
    }
  })
}

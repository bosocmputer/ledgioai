import {
  pgTable, uuid, unique,
} from "drizzle-orm/pg-core"
import { teams } from "./teams"
import { agents } from "./agents"

export const teamAgents = pgTable("team_agents", {
  id:      uuid("id").defaultRandom().primaryKey(),
  teamId:  uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
}, (t) => [
  unique("team_agents_unique").on(t.teamId, t.agentId),
])

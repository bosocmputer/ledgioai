import { z } from "zod/v4"

// ─── Common ──────────────────────────────────────────
export const uuidSchema = z.uuid()

// ─── Agent ───────────────────────────────────────────
export const agentProviders = [
  "anthropic", "openai", "gemini", "ollama", "openrouter", "custom",
] as const

export const createAgentSchema = z.object({
  name:           z.string().min(1).max(255),
  emoji:          z.string().min(1).max(10),
  provider:       z.enum(agentProviders),
  apiKey:         z.string().min(1),
  model:          z.string().min(1).max(255),
  soul:           z.string().min(1),
  role:           z.string().min(1).max(255),
  baseUrl:        z.string().max(512).optional(),
  seniority:      z.number().int().min(0).max(100).optional(),
  useWebSearch:   z.boolean().optional(),
  trustedUrls:    z.array(z.string().url()).optional(),
  mcpEndpoint:    z.string().max(512).optional(),
  mcpAccessMode:  z.string().max(50).optional(),
  templateId:     z.string().uuid().optional(),
})

export const updateAgentSchema = z.object({
  name:           z.string().min(1).max(255).optional(),
  emoji:          z.string().min(1).max(10).optional(),
  provider:       z.enum(agentProviders).optional(),
  apiKey:         z.string().min(1).optional(),
  model:          z.string().min(1).max(255).optional(),
  soul:           z.string().min(1).optional(),
  role:           z.string().min(1).max(255).optional(),
  baseUrl:        z.string().max(512).nullable().optional(),
  seniority:      z.number().int().min(0).max(100).optional(),
  useWebSearch:   z.boolean().optional(),
  isActive:       z.boolean().optional(),
  trustedUrls:    z.array(z.string().url()).optional(),
  mcpEndpoint:    z.string().max(512).nullable().optional(),
  mcpAccessMode:  z.string().max(50).nullable().optional(),
})

// ─── Team ────────────────────────────────────────────
export const createTeamSchema = z.object({
  name:           z.string().min(1).max(255),
  emoji:          z.string().min(1).max(10),
  description:    z.string().max(1000).optional(),
  agentIds:       z.array(z.string().uuid()).min(1),
})

export const updateTeamSchema = z.object({
  name:           z.string().min(1).max(255).optional(),
  emoji:          z.string().min(1).max(10).optional(),
  description:    z.string().max(1000).optional(),
  agentIds:       z.array(z.string().uuid()).optional(),
})

// ─── Memory ──────────────────────────────────────────
export const createMemorySchema = z.object({
  key:            z.string().min(1).max(255),
  value:          z.string().min(1),
  category:       z.string().max(50).optional(),
  confidence:     z.number().int().min(0).max(100).optional(),
})

export const updateMemorySchema = z.object({
  value:          z.string().min(1).optional(),
  category:       z.string().max(50).optional(),
  confidence:     z.number().int().min(0).max(100).optional(),
})

// ─── Meeting ─────────────────────────────────────────
export const meetingModes = ["quick_ask", "consult", "full_board"] as const

export const startMeetingSchema = z.object({
  question:       z.string().min(1).max(10000),
  mode:           z.enum(meetingModes).default("quick_ask"),
  agentIds:       z.array(z.string().uuid()).default([]),
  teamId:         z.string().uuid().optional(),
  clarificationAnswers: z.array(z.object({
    questionId:   z.string(),
    answer:       z.string(),
  })).optional(),
})

// ─── Workspace ───────────────────────────────────────
export const updateWorkspaceSettingsSchema = z.object({
  settings: z.object({
    defaultProvider:      z.enum(agentProviders).optional(),
    defaultModel:         z.string().max(255).optional(),
    maxTokensPerMeeting:  z.number().int().min(1000).max(500000).optional(),
    maxMeetingsPerDay:    z.number().int().min(1).max(1000).optional(),
    enableWebSearch:      z.boolean().optional(),
    enableMcp:            z.boolean().optional(),
    serperApiKey:         z.string().optional(),
    serpApiKey:            z.string().optional(),
  }),
})

export const inviteMemberSchema = z.object({
  email:  z.string().email(),
  role:   z.enum(["admin", "member", "viewer"]).optional(),
})

// ─── Helper ──────────────────────────────────────────
export function parseBody<T>(schema: z.ZodType<T>, data: unknown):
  { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const messages = result.error.issues.map(
    (i) => `${i.path.join(".")}: ${i.message}`
  ).join(", ")
  return { success: false, error: messages }
}

/**
 * Build Mastra-compatible model config from agent DB row
 *
 * Mastra MastraModelConfig accepts:
 * - ModelRouterModelId: "provider/model" string (uses env var for API key)
 * - OpenAICompatibleConfig: { id: "provider/model", apiKey, url } (per-agent keys)
 * - LanguageModelV1/V2 instances from Vercel AI SDK
 *
 * We use OpenAICompatibleConfig so each agent can have its own API key.
 */

import type { agents } from "@/lib/db/schema"
import { decrypt } from "@/lib/encryption"

type AgentRow = typeof agents.$inferSelect

// Map our DB provider enum → Mastra provider prefix
const PROVIDER_MAP: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  gemini: "google",
  ollama: "ollama",
  openrouter: "openrouter",
}

/**
 * Build model config for Mastra Agent constructor.
 * Uses OpenAICompatibleConfig format: { id: "provider/model", apiKey, url? }
 * This allows per-agent API keys instead of relying on env vars.
 */
export function buildModelConfig(agent: AgentRow) {
  const apiKey = decrypt(agent.apiKeyEncrypted)

  if (agent.provider === "custom") {
    if (!agent.baseUrl) throw new Error("Custom provider requires baseUrl")
    return {
      id: `custom/${agent.model}` as const,
      apiKey,
      url: agent.baseUrl,
    }
  }

  if (agent.provider === "ollama") {
    return {
      id: `ollama/${agent.model}` as const,
      apiKey: apiKey || "ollama",
      url: agent.baseUrl || "http://localhost:11434/v1",
    }
  }

  const prefix = PROVIDER_MAP[agent.provider]
  if (!prefix) {
    throw new Error(`Unsupported provider: ${agent.provider}`)
  }

  // OpenAICompatibleConfig with per-agent API key
  return {
    id: `${prefix}/${agent.model}` as `${string}/${string}`,
    apiKey,
    ...(agent.baseUrl ? { url: agent.baseUrl } : {}),
  }
}

/**
 * Get the decrypted API key for an agent (for direct SDK use)
 */
export function getAgentApiKey(agent: AgentRow): string {
  return decrypt(agent.apiKeyEncrypted)
}

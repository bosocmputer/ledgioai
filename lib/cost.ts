/**
 * LLM Cost Calculator
 * Estimates USD cost from token usage per model
 *
 * Prices as of April 2026 — update when providers change pricing.
 * Source:
 *   Anthropic: https://www.anthropic.com/pricing
 *   OpenAI:    https://openai.com/pricing
 *   Google:    https://ai.google.dev/pricing
 *   OpenRouter: varies by model (using common defaults)
 *
 * All prices in USD per 1,000,000 tokens (per-million).
 */

interface ModelPricing {
  inputPerM: number   // USD per 1M input tokens
  outputPerM: number  // USD per 1M output tokens
  cacheReadPerM?: number // USD per 1M cache-read tokens (Anthropic prompt caching)
}

// ── Pricing Table ──────────────────────────────────────
// key format: "provider/model" — must match agent.provider + "/" + agent.model

const PRICING: Record<string, ModelPricing> = {
  // Anthropic
  "anthropic/claude-opus-4-6":       { inputPerM: 15.00, outputPerM: 75.00, cacheReadPerM: 1.50 },
  "anthropic/claude-opus-4":         { inputPerM: 15.00, outputPerM: 75.00, cacheReadPerM: 1.50 },
  "anthropic/claude-sonnet-4-6":     { inputPerM: 3.00,  outputPerM: 15.00, cacheReadPerM: 0.30 },
  "anthropic/claude-sonnet-4":       { inputPerM: 3.00,  outputPerM: 15.00, cacheReadPerM: 0.30 },
  "anthropic/claude-haiku-4-5":      { inputPerM: 0.80,  outputPerM: 4.00,  cacheReadPerM: 0.08 },
  "anthropic/claude-3-5-sonnet-20241022": { inputPerM: 3.00, outputPerM: 15.00, cacheReadPerM: 0.30 },
  "anthropic/claude-3-5-haiku-20241022":  { inputPerM: 0.80, outputPerM: 4.00,  cacheReadPerM: 0.08 },
  "anthropic/claude-3-opus-20240229":     { inputPerM: 15.00, outputPerM: 75.00, cacheReadPerM: 1.50 },

  // OpenAI
  "openai/gpt-4o":               { inputPerM: 2.50,  outputPerM: 10.00 },
  "openai/gpt-4o-mini":          { inputPerM: 0.15,  outputPerM: 0.60  },
  "openai/gpt-4-turbo":          { inputPerM: 10.00, outputPerM: 30.00 },
  "openai/gpt-4":                { inputPerM: 30.00, outputPerM: 60.00 },
  "openai/gpt-3.5-turbo":        { inputPerM: 0.50,  outputPerM: 1.50  },
  "openai/o1":                   { inputPerM: 15.00, outputPerM: 60.00 },
  "openai/o1-mini":              { inputPerM: 1.10,  outputPerM: 4.40  },

  // Google Gemini
  "google/gemini-2.0-flash":     { inputPerM: 0.10,  outputPerM: 0.40  },
  "google/gemini-2.0-flash-lite":{ inputPerM: 0.075, outputPerM: 0.30  },
  "google/gemini-1.5-pro":       { inputPerM: 1.25,  outputPerM: 5.00  },
  "google/gemini-1.5-flash":     { inputPerM: 0.075, outputPerM: 0.30  },
  "google/gemini-1.0-pro":       { inputPerM: 0.50,  outputPerM: 1.50  },

  // OpenRouter (popular models — actual price varies)
  "openrouter/meta-llama/llama-3.1-70b-instruct":  { inputPerM: 0.52, outputPerM: 0.75 },
  "openrouter/meta-llama/llama-3.1-8b-instruct":   { inputPerM: 0.055, outputPerM: 0.055 },
  "openrouter/mistralai/mistral-7b-instruct":       { inputPerM: 0.055, outputPerM: 0.055 },
  "openrouter/deepseek/deepseek-chat":              { inputPerM: 0.14, outputPerM: 0.28 },
  "openrouter/deepseek/deepseek-r1":                { inputPerM: 0.55, outputPerM: 2.19 },

  // Ollama — local inference, no cost
  "ollama/*": { inputPerM: 0, outputPerM: 0 },
}

// Fallback for unknown models per provider
const PROVIDER_FALLBACK: Record<string, ModelPricing> = {
  anthropic:   { inputPerM: 3.00,  outputPerM: 15.00, cacheReadPerM: 0.30 },
  openai:      { inputPerM: 2.50,  outputPerM: 10.00 },
  google:      { inputPerM: 0.10,  outputPerM: 0.40  },
  openrouter:  { inputPerM: 1.00,  outputPerM: 3.00  },
  ollama:      { inputPerM: 0,     outputPerM: 0     },
  custom:      { inputPerM: 0,     outputPerM: 0     },
}

// ── Functions ──────────────────────────────────────────

/**
 * Get pricing for a model. Falls back to provider default if exact model not found.
 */
export function getModelPricing(provider: string, model: string): ModelPricing {
  const exactKey = `${provider}/${model}`
  if (PRICING[exactKey]) return PRICING[exactKey]

  // Check wildcard (e.g. "ollama/*")
  const wildcardKey = `${provider}/*`
  if (PRICING[wildcardKey]) return PRICING[wildcardKey]

  // Provider fallback
  return PROVIDER_FALLBACK[provider] ?? { inputPerM: 0, outputPerM: 0 }
}

/**
 * Calculate estimated USD cost from token counts.
 */
export function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
): number {
  const pricing = getModelPricing(provider, model)

  const inputCost     = (inputTokens     / 1_000_000) * pricing.inputPerM
  const outputCost    = (outputTokens    / 1_000_000) * pricing.outputPerM
  const cacheCost     = (cacheReadTokens / 1_000_000) * (pricing.cacheReadPerM ?? 0)

  return inputCost + outputCost + cacheCost
}

/**
 * Format USD cost for display.
 * < $0.01 → show in sub-cent
 * >= $0.01 → show 4 decimal places
 */
export function formatCostUsd(usd: number): string {
  if (usd === 0) return "$0.00"
  if (usd < 0.0001) return "< $0.0001"
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(4)}`
}

/**
 * Convert USD to THB (approximate rate).
 * Rate is approximate — update periodically.
 */
export function usdToThb(usd: number, rate = 36): number {
  return usd * rate
}

export function formatCostThb(usd: number, rate = 36): string {
  const thb = usdToThb(usd, rate)
  if (thb < 0.01) return "< ฿0.01"
  return `฿${thb.toFixed(2)}`
}

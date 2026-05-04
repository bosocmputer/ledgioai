export interface NormalizedUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

interface UsageLike {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  promptTokens?: number
  completionTokens?: number
}

export function normalizeUsage(usage: UsageLike | null | undefined): NormalizedUsage {
  const inputTokens = usage?.inputTokens ?? usage?.promptTokens ?? 0
  const outputTokens = usage?.outputTokens ?? usage?.completionTokens ?? 0
  const totalTokens = usage?.totalTokens ?? inputTokens + outputTokens

  return { inputTokens, outputTokens, totalTokens }
}

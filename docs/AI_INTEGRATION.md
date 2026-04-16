# LEDGIO AI — AI Integration (Mastra Engine)

> Multi-Agent Meeting Engine ผ่าน Mastra AI — อัพเดต April 2026

---

## Overview

LEDGIO AI ใช้ **Mastra AI** เป็น core engine สำหรับการประชุม แทนการเขียน orchestration เอง

```
Mastra (AgentNetwork)
  ├── Quick Ask   → 1 Agent Stream
  ├── Consult     → AgentNetwork (2-3 agents)
  └── Full Board  → AgentNetwork + 5-Phase Orchestration
        ├── Context Layer (memory, docs, web search, MCP)
        └── Post-Processing (memory extract, stats update)
```

### ทำไมถึงเลือก Mastra

| ต้องการ | Mastra ให้มา |
|--------|-------------|
| Multi-agent orchestration | AgentNetwork built-in |
| Cross-session memory | Memory system (libSQL/Postgres backend) |
| MCP integration | MCP plugin built-in |
| 100+ LLM providers | ผ่าน Vercel AI SDK |
| SSE streaming | built-in |
| Next.js integration | native support |
| Observability / tracing | built-in |
| Production-proven | Replit, PayPal, SoftBank ใช้แล้ว |

---

## 3 Meeting Modes

### Mode 1: Quick Ask ⚡

**ใช้เมื่อ**: คำถามง่าย ต้องการคำตอบเร็ว < 10 วิ

```
User: "ภ.ง.ด.3 ยื่นวันที่เท่าไหร่?"
  └─ 1 Agent (ที่ปรึกษาภาษี)
       └─ Stream คำตอบทันที พร้อมอ้างอิง
```

**Implementation:**

```typescript
// lib/meeting/modes/quick-ask.ts
import { Agent } from "@mastra/core"
import { getAntiHallucinationRules } from "../prompts"

export async function runQuickAsk(
  agentConfig: AgentRow,
  question: string,
  context: MeetingContext,
  send: SSESender
) {
  const agent = new Agent({
    name: agentConfig.name,
    instructions: buildSystemPrompt(agentConfig, context),
    model: buildModel(agentConfig),
  })

  send("agent_start", { agentId: agentConfig.id, name: agentConfig.name, emoji: agentConfig.emoji })

  const stream = await agent.stream(buildUserMessage(question, context))
  let fullContent = ""

  for await (const chunk of stream.textStream) {
    fullContent += chunk
    send("chunk", { agentId: agentConfig.id, content: chunk })
  }

  const usage = await stream.usage
  send("agent_done", { agentId: agentConfig.id, tokensUsed: usage.totalTokens })

  return { content: fullContent, tokens: usage.totalTokens }
}
```

---

### Mode 2: Consult 🤝

**ใช้เมื่อ**: ต้องการ 2nd opinion / ปัญหาที่ต้องมองหลายมุม ใช้เวลา 30-60 วิ

```
User: "ควรรับรู้รายได้ตอนไหน สัญญา 3 ปี?"
  ├─ Agent A (นักบัญชี): วิเคราะห์ตาม TFRS 15
  ├─ Agent B (ผู้ตรวจสอบ): ชี้ความเสี่ยง + red flags
  └─ สรุปจุดที่เห็นต่างและเห็นตรงกัน
```

**Implementation:**

```typescript
// lib/meeting/modes/consult.ts
import { AgentNetwork } from "@mastra/core"

export async function runConsult(
  agentConfigs: AgentRow[],
  question: string,
  context: MeetingContext,
  send: SSESender
) {
  // Phase 1: ทุก agent วิเคราะห์พร้อมกัน (parallel)
  send("status", { message: "กำลังวิเคราะห์..." })

  const analyses = await Promise.all(
    agentConfigs.map(async (agentConfig) => {
      const agent = new Agent({
        name: agentConfig.name,
        instructions: buildSystemPrompt(agentConfig, context),
        model: buildModel(agentConfig),
      })
      send("agent_start", { agentId: agentConfig.id, name: agentConfig.name, emoji: agentConfig.emoji })
      const result = await agent.generate(buildAnalysisPrompt(question, context))
      send("message", { agentId: agentConfig.id, phase: "analysis", content: result.text })
      send("agent_done", { agentId: agentConfig.id })
      return { agent: agentConfig, content: result.text }
    })
  )

  // Phase 2: แต่ละ agent อ่านผลวิเคราะห์ของคนอื่น แล้วถกเถียง
  send("status", { message: "กำลังถกเถียง..." })
  const othersContext = analyses.map(a => `${a.agent.emoji} ${a.agent.name}:\n${a.content}`).join("\n\n")

  for (const { agent: agentConfig, content: myAnalysis } of analyses) {
    const agent = new Agent({
      name: agentConfig.name,
      instructions: buildSystemPrompt(agentConfig, context),
      model: buildModel(agentConfig),
    })
    send("agent_start", { agentId: agentConfig.id, name: agentConfig.name, emoji: agentConfig.emoji })
    const discussion = await agent.generate(
      buildDiscussionPrompt(question, myAnalysis, othersContext, agentConfig)
    )
    send("message", { agentId: agentConfig.id, phase: "discussion", content: discussion.text })
    send("agent_done", { agentId: agentConfig.id })
  }
}
```

---

### Mode 3: Full Board Meeting 🏛️

**ใช้เมื่อ**: การตัดสินใจสำคัญ ต้องการคำตอบที่รอบด้านที่สุด ใช้เวลา 2-5 นาที

```
5-Phase Flow:
Phase 0: CLARIFICATION  — Chairman ถามเพิ่มเติม 3-5 ข้อ
Phase 1: ANALYSIS       — ทุก agent วิเคราะห์อิสระ (parallel)
Phase 2: FINDINGS       — แต่ละ agent นำเสนอ (เรียงตาม seniority)
Phase 3: DISCUSSION     — ถกเถียง ท้วง เสริม (อ่านผลคนอื่น)
Phase 4: SYNTHESIS      — Chairman สรุปมติ + extract memory facts
```

**Implementation:**

```typescript
// lib/meeting/modes/full-board.ts
export async function runFullBoard(
  agentConfigs: AgentRow[],
  question: string,
  context: MeetingContext,
  clarificationAnswers: ClarificationAnswer[] | null,
  send: SSESender
): Promise<MeetingResult> {
  const chairman = detectChairman(agentConfigs)
  const ordered = sortBySeniority(agentConfigs)

  // Phase 0: Clarification (ถ้ายังไม่มีคำตอบ)
  if (!clarificationAnswers) {
    const questions = await runClarificationPhase(chairman, question, context, send)
    send("clarification", { questions })
    return { phase: "waiting_clarification", questions }
  }

  // Build full context (รวม clarification answers ด้วย)
  const fullContext = {
    ...context,
    clarification: buildClarificationContext(clarificationAnswers),
  }

  // Phase 1: Parallel Analysis
  send("phase", { phase: 1, label: "วิเคราะห์" })
  const findings = await runAnalysisPhase(agentConfigs, question, fullContext, send)

  // Phase 2: Findings Presentation (ordered)
  send("phase", { phase: 2, label: "นำเสนอ" })
  await runFindingsPhase(ordered, findings, send)

  // Phase 3: Discussion
  send("phase", { phase: 3, label: "ถกเถียง" })
  await runDiscussionPhase(ordered, findings, question, fullContext, send)

  // Phase 4: Synthesis
  send("phase", { phase: 4, label: "สรุป" })
  const synthesis = await runSynthesisPhase(chairman, findings, question, fullContext, send)

  // Post-processing: Extract memory facts
  const memoryFacts = await extractMemoryFacts(synthesis.content, chairman, fullContext)
  if (memoryFacts.length > 0) {
    send("memory_update", { facts: memoryFacts })
  }

  return { phase: "completed", finalAnswer: synthesis.content, memoryFacts }
}
```

---

## Context Builder

ทุก meeting mode ต้องการ context เดียวกัน:

```typescript
// lib/meeting/context.ts
export interface MeetingContext {
  workspaceId: string
  workspaceInfo: string        // ข้อมูลบริษัท/workspace
  memoryFacts: string          // จาก memory_facts table
  fileContexts: FileContext[]  // เอกสารที่ upload มา
  domainKnowledge: string      // Built-in Thai rules
  antiHallucination: string    // กฎเหล็กห้ามแต่งข้อมูล
}

export async function buildMeetingContext(
  workspaceId: string,
  question: string,
  fileContexts: FileContext[] = []
): Promise<MeetingContext> {
  const [workspaceInfo, memoryFacts] = await Promise.all([
    getWorkspaceInfoContext(workspaceId),
    getMemoryFactsContext(workspaceId),
  ])

  return {
    workspaceId,
    workspaceInfo,
    memoryFacts,
    fileContexts,
    domainKnowledge: getDomainKnowledge(question),
    antiHallucination: getAntiHallucinationRules(),
  }
}
```

---

## System Prompt Builder

```typescript
// lib/meeting/prompts.ts
export function buildSystemPrompt(agent: AgentRow, context: MeetingContext): string {
  return `
${agent.soul}

${context.workspaceInfo ? `## ข้อมูลบริษัท/Workspace\n${context.workspaceInfo}` : ""}

${context.memoryFacts ? `## สิ่งที่จำได้จากการประชุมครั้งก่อน\n${context.memoryFacts}` : ""}

${context.fileContexts.length > 0 ? `## เอกสารแนบ\n${buildFileContext(context.fileContexts)}` : ""}

${context.domainKnowledge ? `## ความรู้ด้านภาษีและบัญชีไทย\n${context.domainKnowledge}` : ""}

${context.antiHallucination}
`.trim()
}

export function getAntiHallucinationRules(): string {
  return `
## กฎเหล็ก — ห้ามแต่งข้อมูล

- ห้ามสร้างเลขที่คำวินิจฉัย หรือคำพิพากษาที่ไม่แน่ใจ 100%
- ห้ามสร้างชื่อ พ.ร.บ. พ.ร.ก. ประกาศ มาตรา ที่ไม่มีอยู่จริง
- ถ้าอ้างมาตรากฎหมาย ต้องแน่ใจว่าเลขถูกต้อง ถ้าไม่แน่ใจให้บอกว่า "ต้องตรวจสอบมาตราที่แน่ชัดอีกครั้ง"
- ถ้า Web Search ให้ข้อมูลขัดแย้งกับความรู้เดิม → เชื่อ Web Search พร้อมระบุแหล่ง
- แยก "ข้อเท็จจริง" กับ "ความเห็น/การตีความ" ให้ชัดเจน
- ถ้าไม่รู้ ให้พูดตรงๆ ว่า "ไม่มีข้อมูลเพียงพอ ควรปรึกษาผู้เชี่ยวชาญเพิ่มเติม"
`.trim()
}
```

---

## Agent Voice System

แต่ละ role มี speaking style ต่างกัน — กำหนดใน `soul` field ของ agent:

| Role | Voice Style | ตัวอย่างประโยค |
|------|------------|--------------|
| ผู้สอบบัญชี (CPA) | ตรงไปตรงมา กล้าชี้จุดอ่อน | "ข้อมูลที่ได้รับยังไม่เพียงพอต่อการออกความเห็น..." |
| ที่ปรึกษาภาษี | วิเคราะห์ละเอียด อ้างมาตรา | "ตามมาตรา 77/1 แห่งประมวลรัษฎากร..." |
| นักวิเคราะห์การเงิน | เน้นตัวเลข ratio | "อัตราส่วนหนี้สินต่อทุน (D/E) อยู่ที่ 2.3x ซึ่ง..." |
| ผู้ตรวจสอบภายใน | ชี้ความเสี่ยง red flags | "มีสัญญาณที่น่ากังวล 3 ประการ คือ..." |
| นักบัญชีอาวุโส | เน้นมาตรฐาน ความถูกต้อง | "ตามมาตรฐานการบัญชี TFRS ฉบับที่..." |
| ที่ปรึกษากฎหมาย | เน้นสัญญา สิทธิ ความเสี่ยง | "ตามพระราชบัญญัติแรงงาน พ.ศ. 2541..." |

---

## Chairman Detection

```typescript
// lib/meeting/chairman.ts
export function detectChairman(agents: AgentRow[]): AgentRow {
  // seniority ต่ำสุด = ระดับสูงสุด = Chairman
  return [...agents].sort((a, b) => (a.seniority ?? 99) - (b.seniority ?? 99))[0]
}

export function sortBySeniority(agents: AgentRow[]): AgentRow[] {
  return [...agents].sort((a, b) => (a.seniority ?? 99) - (b.seniority ?? 99))
}
```

---

## Memory Extraction

หลัง Full Board จบ — Chairman สกัด key facts เก็บใน `memory_facts`:

```typescript
// lib/meeting/memory.ts
export async function extractMemoryFacts(
  synthesis: string,
  chairman: AgentRow,
  context: MeetingContext
): Promise<MemoryFact[]> {
  const agent = new Agent({
    name: chairman.name,
    instructions: "คุณเป็นผู้ช่วยสกัดข้อเท็จจริงสำคัญ",
    model: buildModel(chairman),
  })

  const result = await agent.generate(`
จากสรุปการประชุมนี้ กรุณาสกัดข้อเท็จจริงสำคัญของบริษัทเป็น JSON array:

สรุป:
${synthesis}

Format: [{"key": "vat_status", "value": "จดทะเบียน VAT", "category": "tax"}]

กฎ:
- เก็บเฉพาะข้อเท็จจริงถาวร ไม่ใช่ความเห็นชั่วคราว
- key เป็น snake_case ภาษาอังกฤษ
- category: "tax" | "company" | "employee" | "accounting" | "legal" | "other"
- ถ้าไม่มีข้อเท็จจริงใหม่ ให้ return []
`)

  try {
    const facts = JSON.parse(result.text.match(/\[[\s\S]*\]/)?.[0] ?? "[]")
    return facts
  } catch {
    return []
  }
}
```

---

## Web Search Integration

```typescript
// lib/integrations/web-search.ts
export async function searchWeb(
  query: string,
  trustedUrls: string[] = []
): Promise<WebSource[]> {
  // Scope query ไปที่ trusted domains ถ้ามี
  const scopedQuery = trustedUrls.length > 0
    ? `${query} (${trustedUrls.map(u => `site:${u}`).join(" OR ")})`
    : query

  // Primary: Serper
  try {
    const results = await callSerper(scopedQuery)
    return results
  } catch {
    // Fallback: SerpApi
    return callSerpApi(scopedQuery)
  }
}

// Auto-search สำหรับ domain questions (ภาษี/กฎหมาย/บัญชี)
export function shouldAutoSearch(question: string): boolean {
  const taxKeywords = ["ภาษี", "VAT", "ภ.ง.ด", "PP", "กรมสรรพากร", "rd.go.th"]
  const legalKeywords = ["พ.ร.บ", "มาตรา", "กฎหมาย", "แรงงาน", "สัญญา"]
  const accountingKeywords = ["TFRS", "มาตรฐานการบัญชี", "งบการเงิน", "NPAEs", "PAEs"]
  const allKeywords = [...taxKeywords, ...legalKeywords, ...accountingKeywords]
  return allKeywords.some(kw => question.includes(kw))
}
```

---

## MCP Integration (ERP / Centrix)

```typescript
// lib/integrations/mcp-client.ts
export async function fetchMcpContext(
  mcpEndpoint: string,
  question: string
): Promise<string> {
  // 1. ดึง available tools
  const tools = await fetch(`${mcpEndpoint}/tools`).then(r => r.json())

  // 2. Score tools ตามความเกี่ยวข้องกับคำถาม
  const scored = scoreTools(tools, question)
  const top3 = scored.slice(0, 3)

  // 3. Call tools และรวม results
  const results = await Promise.all(
    top3.map(tool => callMcpTool(mcpEndpoint, tool, question))
  )

  return formatMcpResults(results)
}

function scoreTools(tools: McpTool[], question: string): McpTool[] {
  return tools
    .filter(t => t.name.startsWith("get_") || t.name.startsWith("search_") || t.name.startsWith("list_"))
    .map(t => ({
      ...t,
      score: calculateRelevance(t.name + " " + t.description, question),
    }))
    .sort((a, b) => b.score - a.score)
}
```

---

## Document Parsing

```typescript
// lib/documents/parser.ts
export async function parseDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ParsedDocument> {
  const MAX_CHARS = 40_000

  let content: string

  if (mimeType === "application/pdf" || filename.endsWith(".pdf")) {
    content = await parsePdf(buffer)
  } else if (mimeType.includes("spreadsheet") || filename.match(/\.xlsx?$/)) {
    content = await parseExcel(buffer)
  } else if (mimeType.includes("wordprocessingml") || filename.endsWith(".docx")) {
    content = await parseWord(buffer)
  } else if (filename.endsWith(".csv")) {
    content = parseCsv(buffer.toString("utf8"))
  } else {
    content = buffer.toString("utf8")
  }

  return {
    filename,
    content: content.slice(0, MAX_CHARS),
    tokens: Math.ceil(content.length / 4),  // rough estimate
    truncated: content.length > MAX_CHARS,
  }
}
```

---

## SSE Events Reference

| Event | Data | เมื่อไหร่ |
|-------|------|---------|
| `session` | `{ sessionId, mode }` | เริ่มต้น |
| `status` | `{ message }` | อัพเดตสถานะ |
| `phase` | `{ phase: 0-4, label }` | Full Board เข้า phase ใหม่ |
| `agent_start` | `{ agentId, name, emoji, isChairman }` | Agent เริ่มพูด |
| `chunk` | `{ agentId, content }` | Streaming chunk |
| `message` | `{ agentId, phase, content, tokensUsed }` | Agent พูดจบ |
| `agent_done` | `{ agentId }` | Agent เสร็จ |
| `web_source` | `{ agentId, sources: [] }` | Web search results |
| `clarification` | `{ questions: string[] }` | Phase 0 คำถาม |
| `memory_update` | `{ facts: [] }` | Memory ที่ extract ได้ |
| `error` | `{ message }` | Error |
| `done` | `{ meetingId, totalTokens }` | จบทั้งหมด |

---

## LLM Provider Config

ผ่าน Mastra (Vercel AI SDK) — รองรับ 100+ providers:

```typescript
// lib/meeting/model.ts
import { anthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"
import { google } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"  // for OpenRouter / custom

export function buildModel(agent: AgentRow) {
  const apiKey = decrypt(agent.apiKeyEncrypted)

  switch (agent.provider) {
    case "anthropic":
      return anthropic(agent.model, { apiKey })

    case "openai":
      return openai(agent.model, { apiKey })

    case "gemini":
      return google(agent.model, { apiKey })

    case "openrouter":
      return createOpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
      })(agent.model)

    case "ollama":
      return createOpenAI({
        apiKey: "ollama",
        baseURL: agent.baseUrl ?? "http://localhost:11434/v1",
      })(agent.model)

    case "custom":
      return createOpenAI({
        apiKey,
        baseURL: agent.baseUrl!,
      })(agent.model)
  }
}
```

**LLM Defaults:**

```typescript
export const LLM_DEFAULTS = {
  maxTokens: 2048,
  temperature: 0.3,
}
```

---

## Mastra Setup (Next.js)

```typescript
// lib/mastra/index.ts
import { Mastra } from "@mastra/core"
import { PgMemory } from "@mastra/pg"

export const mastra = new Mastra({
  memory: new PgMemory({
    connectionString: process.env.DATABASE_URL!,
  }),
  logger: {
    type: "PINO",
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  },
})
```

```typescript
// next.config.ts — เพิ่ม serverExternalPackages
const config: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pino", "pino-pretty", "pdf-parse", "@mastra/core"],
}
```

---

## Domain Knowledge (Built-in Thai Rules)

```typescript
// lib/domain-knowledge.ts
export function getDomainKnowledge(question: string): string {
  const sections: string[] = []

  if (matchesVAT(question)) {
    sections.push(`
## ภาษีมูลค่าเพิ่ม (VAT)
- อัตรา VAT ปัจจุบัน 7% (ลดจาก 10%)
- จดทะเบียน VAT เมื่อรายได้เกิน 1.8 ล้านบาท/ปี
- ยื่น PP.30 ภายในวันที่ 15 ของเดือนถัดไป
- ยื่น PP.36 สำหรับบริการจากต่างประเทศ
`)
  }

  if (matchesCIT(question)) {
    sections.push(`
## ภาษีเงินได้นิติบุคคล (CIT)
- อัตราภาษีนิติบุคคล 20% ของกำไรสุทธิ
- SME (ทุนไม่เกิน 5 ล้าน รายได้ไม่เกิน 30 ล้าน): ขั้นบันได 15%-20%
- ยื่น ภ.ง.ด.51 ภายใน 2 เดือนหลังครึ่งรอบบัญชี
- ยื่น ภ.ง.ด.50 ภายใน 150 วันหลังสิ้นรอบบัญชี
`)
  }

  if (matchesWHT(question)) {
    sections.push(`
## ภาษีหัก ณ ที่จ่าย (Withholding Tax)
- ยื่น ภ.ง.ด.1 (เงินเดือน) ภายในวันที่ 7 ของเดือนถัดไป
- ยื่น ภ.ง.ด.3 (บุคคลธรรมดา) ภายในวันที่ 7
- ยื่น ภ.ง.ด.53 (นิติบุคคล) ภายในวันที่ 7
- อัตรา WHT แตกต่างกันตามประเภทรายจ่าย (1%-15%)
`)
  }

  if (matchesLabor(question)) {
    sections.push(`
## กฎหมายแรงงาน
- ค่าแรงขั้นต่ำ: ตรวจสอบประกาศล่าสุดจากกระทรวงแรงงาน
- ค่าชดเชย: คำนวณตามอายุงาน (30 วัน - 400 วัน)
- ลาพักร้อน: ไม่น้อยกว่า 6 วัน/ปี หลังทำงานครบ 1 ปี
- ค่าล่วงเวลา: 1.5 เท่าในวันทำงาน, 3 เท่าในวันหยุด
`)
  }

  return sections.join("\n")
}
```

---

## Error Handling & Resilience

```typescript
// lib/meeting/engine.ts
export async function runMeeting(config: MeetingConfig, send: SSESender) {
  const TIMEOUTS = {
    quick_ask: 30_000,   // 30 วิ
    consult: 90_000,     // 90 วิ
    full_board: 300_000, // 5 นาที
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUTS[config.mode])

  try {
    switch (config.mode) {
      case "quick_ask":
        await runQuickAsk(config.agents[0], config.question, config.context, send)
        break
      case "consult":
        await runConsult(config.agents, config.question, config.context, send)
        break
      case "full_board":
        await runFullBoard(
          config.agents, config.question, config.context,
          config.clarificationAnswers ?? null, send
        )
        break
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      send("error", { message: "การประชุมใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง" })
    } else {
      send("error", { message: "เกิดข้อผิดพลาด กรุณาลองใหม่" })
    }
  } finally {
    clearTimeout(timeout)
    send("done", { meetingId: config.meetingId })
  }
}
```

**Agent Failure Policy:**
- Quick Ask: ถ้า agent ล้มเหลว → send error ทันที
- Consult: ถ้า agent ใดล้มเหลว → ดำเนินการด้วย agents ที่เหลือ + แจ้งใน summary
- Full Board: ถ้า agent ล้มเหลวใน Phase 1 → ข้ามไปใช้ findings ที่ได้ / ถ้า chairman ล้มเหลว → ใช้ agent ที่มี seniority ถัดไปแทน

---

## API Keys Required

| Service | เก็บที่ | วิธีได้ |
|---------|--------|--------|
| Anthropic | agents.api_key_encrypted | console.anthropic.com |
| OpenRouter | agents.api_key_encrypted | openrouter.ai/keys |
| OpenAI | agents.api_key_encrypted | platform.openai.com |
| Gemini | agents.api_key_encrypted | aistudio.google.com |
| Serper | workspace_settings.serper_api_key_encrypted | serper.dev |
| SerpApi | workspace_settings.serp_api_key_encrypted | serpapi.com |

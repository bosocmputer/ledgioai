# LEDGIO AI — AI Integration Plan

> Multi-Provider LLM, Meeting Flow Engine, Supermemory, Document Parsing

## 🎯 Overview

LEDGIO AI มี AI capabilities หลายส่วน:
1. **Multi-Provider LLM** — 6 providers (Anthropic, OpenRouter, OpenAI, Gemini, Ollama, Custom)
2. **5-Phase Meeting Flow** — Clarification → Analysis → Findings → Discussion → Synthesis
3. **Web Search** — Serper + SerpApi with trusted URL scoping
4. **MCP Integration** — เชื่อม ERP/บัญชี ผ่าน MCP Protocol 
5. **Document Parsing** — PDF, Excel, Word, CSV, JSON, Text
6. **Cross-Session Memory** — จำข้อมูลข้ามเซสชัน
7. **Domain Knowledge** — Built-in Thai tax/accounting rules
8. **Supermemory** — Vector memory API (Phase 5)

## 📦 Architecture

```
┌─────────────────────────────────────┐
│          Meeting Flow Engine         │
│  (5-Phase Orchestration)            │
├──────────┬──────────┬───────────────┤
│ LLM      │ Context  │ Post-Process  │
│ Caller   │ Builder  │ Memory Extract│
├──────────┴──────────┴───────────────┤
│          Context Sources             │
│ ┌────────┐ ┌─────┐ ┌──────────────┐│
│ │Company │ │Docs │ │Web Search    ││
│ │Info    │ │Upload│ │(Serper/Serp) ││
│ ├────────┤ ├─────┤ ├──────────────┤│
│ │Memory  │ │Know-│ │MCP Server    ││
│ │Facts   │ │ledge│ │(ERP Data)    ││
│ ├────────┤ ├─────┤ ├──────────────┤│
│ │Domain  │ │Hist-│ │Supermemory   ││
│ │Rules   │ │ory  │ │(Vector, P5)  ││
│ └────────┘ └─────┘ └──────────────┘│
└─────────────────────────────────────┘
```

## 🔧 LLM Caller — callLLM()

ย้ายมาจาก BossBoard `stream/route.ts` L51-178 — รองรับ 6 providers:

```typescript
// lib/llm/call-llm.ts

interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface LLMResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export async function callLLM(
  provider: string,
  model: string,
  apiKey: string,
  baseUrl: string | undefined,
  messages: LLMMessage[],
  signal?: AbortSignal
): Promise<LLMResponse> {
  // Provider-specific implementation
  switch (provider) {
    case "anthropic":    return callAnthropic(model, apiKey, messages, signal);
    case "openrouter":   return callOpenRouter(model, apiKey, messages, signal);
    case "openai":
    case "custom":       return callOpenAI(model, apiKey, baseUrl, messages, signal);
    case "gemini":       return callGemini(model, apiKey, messages, signal);
    case "ollama":       return callOllama(model, baseUrl, messages, signal);
    default:             throw new Error(`Unknown provider: ${provider}`);
  }
}

export async function callLLMWithRetry(
  provider: string, model: string, apiKey: string, baseUrl: string | undefined,
  messages: LLMMessage[], signal?: AbortSignal, retries = 1
): Promise<LLMResponse> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callLLM(provider, model, apiKey, baseUrl, messages, signal);
    } catch (err: unknown) {
      const isRateLimit = err instanceof Error && 
        (err.message.includes("429") || err.message.includes("rate"));
      if (isRateLimit && attempt < retries) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("callLLMWithRetry: exhausted retries");
}
```

### Provider-Specific Details

| Provider | Endpoint | Features |
|----------|----------|----------|
| **Anthropic** | `api.anthropic.com/v1/messages` | Prompt caching (ephemeral), cache_read_input_tokens |
| **OpenRouter** | `openrouter.ai/api/v1/chat/completions` | Auto-fallback to gpt-4o-mini on 400/404 |
| **OpenAI** | `api.openai.com/v1/chat/completions` | Custom baseUrl supported |
| **Gemini** | `generativelanguage.googleapis.com/v1beta` | system_instruction separate |
| **Ollama** | `localhost:11434/api/chat` | Custom baseUrl, stream: false |
| **Custom** | User-defined baseUrl | OpenAI-compatible API |

### LLM Configuration Defaults

```typescript
const LLM_DEFAULTS = {
  max_tokens: 2048,
  temperature: 0.3,
};
```

## 🏛️ Meeting Flow Engine — 5-Phase

### Phase Overview

```
Phase 0: CLARIFICATION (ถามคำถามเพิ่มเติม)
  ├── Chairman ถามคำถามเชิงสำรวจ 3-5 ข้อ
  ├── User ตอบ → inject เป็น clarificationContext
  └── ถ้า user skip → ดำเนินการต่อ

Phase 1: PARALLEL ANALYSIS (วิเคราะห์พร้อมกัน)
  ├── แต่ละ agent วิเคราะห์อิสระ (ตาม role/soul)
  ├── Web search (ถ้า agent เปิด useWebSearch)
  ├── MCP data fetch (ถ้ามี mcpEndpoint)
  └── Agent knowledge context

Phase 2: FINDINGS (นำเสนอข้อค้นพบ)
  ├── แต่ละ agent สรุปข้อค้นพบหลัก
  └── เรียงตาม seniority (chairman first)

Phase 3: DISCUSSION (อภิปราย)
  ├── Agents อ่านข้อค้นพบของกันและกัน
  ├── ถกเถียง เสริม ท้วง ตั้งคำถาม
  └── Each agent ตอบตาม "voice" ของตัวเอง

Phase 4: SYNTHESIS (สรุปมติ)
  ├── Chairman สรุป
  ├── รวบรวมมติทั้งทีม
  ├── Extract memory facts (key-value)
  └── Final answer
```

### Meeting Engine Implementation

```typescript
// lib/meeting/engine.ts

interface MeetingConfig {
  question: string;
  agents: AgentPublic[];
  companyId: string;
  sessionId: string;
  mode: "full" | "discuss" | "close" | "qa";
  clarificationAnswers?: { question: string; answer: string }[];
  fileContexts?: FileContext[];
  conversationHistory?: ConversationTurn[];
  historyMode?: "full" | "summary" | "last3" | "none";
}

export async function runMeeting(config: MeetingConfig, send: SSESender) {
  const chairman = detectChairman(config.agents);
  const orderedAgents = sortBySeniority(config.agents, chairman);
  
  // Build context
  const companyContext = await getCompanyInfoContext(config.companyId);
  const memoryContext = await getMemoryContext(config.companyId);
  const fileContext = buildFileContext(config.fileContexts);
  const historyContext = buildHistoryContext(config.conversationHistory);
  const clarificationContext = buildClarificationContext(config.clarificationAnswers);
  const domainKnowledge = getDomainKnowledge(config.question);
  
  // Anti-hallucination rules (injected into ALL prompts)
  const antiHallucinationRules = getAntiHallucinationRules();
  
  if (config.mode === "qa") {
    await runQAMode(chairman, config, send);
    return;
  }
  
  // Phase 0: Clarification (ถ้ายังไม่มี answers)
  if (config.mode === "full" && !config.clarificationAnswers) {
    await runClarificationPhase(chairman, config, send);
    return; // Wait for user response
  }
  
  // Phase 1: Parallel Analysis
  const findings = await runAnalysisPhase(orderedAgents, config, send);
  
  // Phase 2: Findings Presentation
  await runFindingsPhase(orderedAgents, findings, config, send);
  
  // Phase 3: Discussion
  await runDiscussionPhase(orderedAgents, findings, config, send);
  
  // Phase 4: Synthesis
  await runSynthesisPhase(chairman, orderedAgents, findings, config, send);
}
```

### Agent Voice System

แต่ละ role มี speaking style ต่างกัน:

| Role | Voice Style |
|------|------------|
| CPA/ผู้สอบบัญชี | ตรงไปตรงมา, กล้าชี้จุดอ่อน, เน้นอิสระ |
| ที่ปรึกษาภาษี | วิเคราะห์ละเอียด, ยกตัวเลข, อ้างมาตรา |
| นักวิเคราะห์งบ | เน้นตัวเลข ratio สถิติ, พูดน้อยแต่คม |
| ผู้ตรวจสอบภายใน | ท้าทาย, ชี้ความเสี่ยงซ่อน, มอง red flag |
| นักบัญชีอาวุโส | พูดเป็นระบบ, อ้างมาตรฐาน, เน้นความถูกต้อง |

### Chairman Detection Algorithm

```typescript
// เลือก chairman จาก seniority (ต่ำสุด = chairman)
// ถ้า seniority เท่ากัน → match role กับ CHAIRMAN_ROLES list
function detectChairman(agents: AgentPublic[]): AgentPublic {
  return [...agents].sort((a, b) => {
    const sa = a.seniority ?? 99;
    const sb = b.seniority ?? 99;
    return sa - sb;
  })[0];
}
```

## 🌐 Web Search Integration

### Flow
1. Agent มี `useWebSearch: true` → ค้นหาอัตโนมัติ
2. ถ้าเป็น domain question (ภาษี/บัญชี/แรงงาน) → auto search แม้ไม่เปิด flag
3. **Search Query Rewriting** → ใช้ LLM แปลงคำถามเป็น search query ที่ดี
4. Serper เป็น primary → SerpApi fallback
5. **Trusted URL Scoping** → ถ้า agent มี trustedUrls → scope search เฉพาะ domain นั้น

```typescript
// ตัวอย่าง trustedUrls
agent.trustedUrls = ["rd.go.th", "dbd.go.th", "sec.or.th"];
// Search query จะกลายเป็น:
// "ภาษีมูลค่าเพิ่ม (site:rd.go.th OR site:dbd.go.th OR site:sec.or.th)"
```

## 🔌 MCP Integration

### Architecture
```
LEDGIO AI → fetchMcpContext() → MCP Server (ERP/Centrix)
  1. GET /tools → list available tools
  2. Score tools by question relevance
  3. POST /call → call top 3 tools
  4. Inject results as context
```

### Tool Selection Algorithm
- Match question keywords against tool name + description
- Intent detection (sales/customer/stock keywords)
- Boost analytical tools for matching intent
- Filter: read-only tools only (get_*, search_*, list_*)
- Take top 3 tools

### MCP Tool Argument Inference
ถ้า tool ไม่มี inputSchema → infer arguments จากชื่อ tool:
- `search_*` → `{ keyword: question }`
- `get_sales_*` → `{ start_date, end_date, response_format: "markdown" }`
- `get_customer_rfm` → `{ months: 12 }`

## 📄 Document Parsing

### Supported Formats

| Format | Library | Magic Bytes |
|--------|---------|------------|
| PDF | pdf-parse | `%PDF` (0x25504446) |
| Excel (.xlsx/.xls) | xlsx | `PK` (ZIP) / OLE2 |
| Word (.docx) | mammoth | `PK` (ZIP) |
| CSV | Built-in | N/A |
| JSON | Built-in | N/A |
| Text (.txt/.md) | Built-in | N/A |

### Limits
- **MAX_BYTES**: 10 MB per file
- **MAX_CONTEXT_CHARS**: 40,000 characters per file context
- **MAX_KNOWLEDGE_CHARS**: 100,000 characters per agent knowledge

### Processing Pipeline
```
Upload → Validate magic bytes → Parse → Truncate → Store in DB
                                                     ↓
                                              agent_knowledge table
```

## 🧠 Cross-Session Memory

### How It Works
1. หลังจบ meeting → Chairman extract key facts
2. เก็บเป็น key-value pairs (e.g., `vat_status: "จดทะเบียน VAT"`)
3. Session ถัดไป → inject memory context เป็น system context
4. Upsert: ถ้า key ซ้ำ → update value

### Memory Extraction Prompt

```
จากคำตอบข้างต้น กรุณาสกัดข้อเท็จจริงสำคัญของบริษัทเป็น JSON array:
[{"key": "vat_status", "value": "จดทะเบียน VAT"}]
กฎ: เก็บเฉพาะข้อเท็จจริง ไม่ใช่ความเห็น, key เป็น snake_case ภาษาอังกฤษ
```

### Memory Context Injection

```
🧠 ข้อมูลจากการประชุมครั้งก่อน (Cross-Session Memory):
- vat_status: จดทะเบียน VAT
- company_type: บริษัทจำกัด
- employee_count: 15 คน
- accounting_standard: NPAEs
```

## 🔮 Phase 5: Supermemory Integration

### Why Supermemory
- **Free tier**: 1M tokens/month + 10K queries/month
- **No self-hosting needed** — API-based
- **Semantic search** — ค้นหาด้วยความหมาย ไม่ใช่แค่ keyword

### Integration Plan

```typescript
// lib/memory/supermemory.ts
const SUPERMEMORY_API = "https://api.supermemory.ai/v1";

export async function addMemory(content: string, companyId: string) {
  return fetch(`${SUPERMEMORY_API}/memories`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      metadata: { companyId },
    }),
  });
}

export async function searchMemory(query: string, companyId: string) {
  return fetch(`${SUPERMEMORY_API}/search`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      filter: { companyId },
      limit: 5,
    }),
  });
}
```

### Use Cases
1. **Knowledge Base RAG** — ค้นหาเอกสารที่เกี่ยวข้องจาก Knowledge Base
2. **Session History RAG** — ค้นหาคำตอบจากเซสชันเก่า
3. **Memory Facts** — semantic search over cross-session memory

## 🚫 Anti-Hallucination Rules

Injected into EVERY prompt:

```
🚫 กฎเหล็กป้องกันข้อมูลเท็จ:
- ห้ามสร้างเลขที่คำวินิจฉัย คำพิพากษา ที่ไม่แน่ใจ 100%
- ห้ามสร้างชื่อ พ.ร.บ. พ.ร.ก. ประกาศ ที่ไม่มีอยู่จริง
- ถ้าอ้างมาตรากฎหมาย ต้องแน่ใจว่าเลขถูกต้อง
- ถ้า Web Search ขัดกับความรู้เดิม → เชื่อ Web Search
- แยก "ข้อเท็จจริง" กับ "ความเห็น/การตีความ"
```

## 🔄 SSE Streaming Events

| Event | Data | When |
|-------|------|------|
| `session` | `{ sessionId }` | เริ่มต้น |
| `chairman` | `{ agentId, name, emoji, role }` | ระบุประธาน |
| `status` | `{ message }` | Update สถานะ |
| `agent_start` | `{ agentId, name, emoji, role, isChairman }` | Agent เริ่มพูด |
| `message` | `{ id, agentId, role, content, tokensUsed }` | Agent ส่งข้อความ |
| `agent_done` | `{ agentId }` | Agent พูดจบ |
| `web_source` | `{ agentId, sources: [] }` | แหล่งข้อมูล web |
| `clarification` | `{ questions: [] }` | คำถามเพิ่มเติม |
| `memory_update` | `{ facts: [] }` | Memory ที่ extract ได้ |
| `error` | `{ message }` | Error |
| `done` | `{ sessionId }` | จบทั้งหมด |

## 🔑 API Keys Required

| Service | Environment Variable | Get From |
|---------|---------------------|----------|
| Anthropic | Stored in DB (per agent) | console.anthropic.com |
| OpenRouter | Stored in DB (per agent) | openrouter.ai/keys |
| OpenAI | Stored in DB (per agent) | platform.openai.com |
| Gemini | Stored in DB (per agent) | aistudio.google.com |
| Serper | Stored in DB (company_settings) | serper.dev |
| SerpApi | Stored in DB (company_settings) | serpapi.com |
| Supermemory | Stored in DB (company_settings) | console.supermemory.ai |

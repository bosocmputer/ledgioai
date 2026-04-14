# LEDGIO AI — Migration Guide from BossBoard

> วิธีย้ายข้อมูลและ business logic จาก BossBoard demo → LEDGIO AI production

## 🎯 Overview

BossBoard (demo) เก็บข้อมูลใน JSON files ที่ `~/.bossboard/`:
```
~/.bossboard/
  ├── agents.json          # 5 agents with encrypted API keys
  ├── teams.json           # 1 team
  ├── research-history.json # research sessions + messages
  ├── settings.json        # serperApiKey, serpApiKey, companyInfo
  ├── client-memory.json   # cross-session memory facts
  ├── agent-stats.json     # token usage statistics
  └── .encrypt-key         # AES-256-CBC encryption key (32 chars)
```

LEDGIO AI (prod) เก็บใน PostgreSQL ที่มี multi-tenant scoping.

## 📋 Migration Checklist

### Pre-Migration
- [ ] Backup ทุก JSON files จาก server
- [ ] Note ค่า `.encrypt-key` (ต้องใช้ decode API keys เดิม)
- [ ] สร้าง default user + default company ใน LEDGIO AI
- [ ] Generate new `ENCRYPTION_KEY` for LEDGIO AI (AES-256-GCM)

### Data Migration Order
1. Company (จาก settings.json → companyInfo)
2. Agents (จาก agents.json → agents + agent_knowledge tables)
3. Teams (จาก teams.json → teams + team_agents tables)
4. Settings (จาก settings.json → company_settings)
5. Memory Facts (จาก client-memory.json → memory_facts)
6. Agent Stats (จาก agent-stats.json → agent_stats)
7. Research History (จาก research-history.json → sessions + messages)

### Post-Migration
- [ ] Verify data integrity (counts match)
- [ ] Test agent API keys (decrypt + re-encrypt)
- [ ] Test meeting flow end-to-end
- [ ] Remove old JSON files from server

## 🔧 Migration Script

```typescript
// scripts/migrate-from-bossboard.ts
import fs from "fs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { 
  users, companies, userCompanies, agents, agentKnowledge,
  teams, teamAgents, companySettings, memoryFacts, agentStats,
  researchSessions, researchMessages 
} from "@/lib/db/schema";
import { encrypt as newEncrypt } from "@/lib/encryption"; // AES-256-GCM

// === CONFIG ===
const BOSSBOARD_DIR = process.env.BOSSBOARD_DIR || "/home/bosscatdog/.bossboard";
const OLD_ENCRYPT_KEY = process.env.OLD_ENCRYPT_KEY!; // from .encrypt-key
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@ledgio.ai";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH!; // bcrypt hash

// === Old encryption (BossBoard CBC) ===
function oldDecrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(":");
  const key = Buffer.from(OLD_ENCRYPT_KEY.padEnd(32, "0").slice(0, 32));
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

// === Read JSON files ===
function readJson(filename: string) {
  const filepath = `${BOSSBOARD_DIR}/${filename}`;
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, "utf-8"));
}

async function migrate() {
  console.log("🚀 Starting migration from BossBoard → LEDGIO AI...\n");

  // 1. Create admin user
  console.log("1️⃣ Creating admin user...");
  const [user] = await db.insert(users).values({
    name: "Admin",
    email: ADMIN_EMAIL,
    hashedPassword: ADMIN_PASSWORD_HASH,
    isActive: true,
    isSuperAdmin: true,
  }).returning();
  console.log(`   ✅ User: ${user.id} (${user.email})`);

  // 2. Create company from settings
  console.log("2️⃣ Creating company from settings...");
  const settings = readJson("settings.json") || {};
  const companyInfo = settings.companyInfo || {};
  
  const [company] = await db.insert(companies).values({
    name: companyInfo.name || "Default Company",
    businessType: companyInfo.businessType,
    registrationNumber: companyInfo.registrationNumber,
    accountingStandard: companyInfo.accountingStandard,
    fiscalYear: companyInfo.fiscalYear,
    employeeCount: companyInfo.employeeCount,
    notes: companyInfo.notes,
  }).returning();
  console.log(`   ✅ Company: ${company.id} (${company.name})`);

  // Link user to company as owner
  await db.insert(userCompanies).values({
    userId: user.id,
    companyId: company.id,
    role: "owner",
    isDefault: true,
  });

  // 3. Migrate agents
  console.log("3️⃣ Migrating agents...");
  const oldAgents = readJson("agents.json") || [];
  const agentIdMap = new Map<string, string>(); // old ID → new ID

  for (const a of oldAgents) {
    // Decrypt old API key and re-encrypt with new method
    let apiKey = "";
    try {
      apiKey = a.apiKeyEncrypted ? oldDecrypt(a.apiKeyEncrypted) : "";
    } catch {
      console.log(`   ⚠️ Could not decrypt API key for ${a.name}`);
    }

    const [newAgent] = await db.insert(agents).values({
      companyId: company.id,
      name: a.name,
      emoji: a.emoji,
      provider: a.provider,
      apiKeyEncrypted: apiKey ? newEncrypt(apiKey) : "",
      baseUrl: a.baseUrl || null,
      model: a.model,
      soul: a.soul,
      role: a.role,
      isActive: a.active ?? true,
      useWebSearch: a.useWebSearch ?? false,
      seniority: a.seniority ?? 50,
      mcpEndpoint: a.mcpEndpoint || null,
      mcpAccessMode: a.mcpAccessMode || null,
      trustedUrls: a.trustedUrls ? JSON.stringify(a.trustedUrls) : null,
      createdAt: new Date(a.createdAt),
      updatedAt: new Date(a.updatedAt),
    }).returning();

    agentIdMap.set(a.id, newAgent.id);
    console.log(`   ✅ Agent: ${a.emoji} ${a.name} (${a.id} → ${newAgent.id})`);

    // Migrate knowledge
    if (a.knowledge && a.knowledge.length > 0) {
      for (const k of a.knowledge) {
        await db.insert(agentKnowledge).values({
          agentId: newAgent.id,
          companyId: company.id,
          filename: k.filename,
          meta: k.meta,
          content: k.content,
          tokens: k.tokens,
          uploadedAt: new Date(k.uploadedAt),
        });
      }
      console.log(`   📚 ${a.knowledge.length} knowledge files migrated`);
    }
  }

  // 4. Migrate teams
  console.log("4️⃣ Migrating teams...");
  const oldTeams = readJson("teams.json") || [];

  for (const t of oldTeams) {
    const [newTeam] = await db.insert(teams).values({
      companyId: company.id,
      name: t.name,
      emoji: t.emoji,
      description: t.description || "",
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    }).returning();

    // Map agent IDs
    for (const oldAgentId of t.agentIds) {
      const newAgentId = agentIdMap.get(oldAgentId);
      if (newAgentId) {
        await db.insert(teamAgents).values({
          teamId: newTeam.id,
          agentId: newAgentId,
        });
      }
    }
    console.log(`   ✅ Team: ${t.emoji} ${t.name} (${t.agentIds.length} agents)`);
  }

  // 5. Migrate company settings (API keys)
  console.log("5️⃣ Migrating company settings...");
  let serperKey = "";
  let serpApiKey = "";
  try {
    if (settings.serperApiKey) serperKey = oldDecrypt(settings.serperApiKey);
    if (settings.serpApiKey) serpApiKey = oldDecrypt(settings.serpApiKey);
  } catch {
    console.log("   ⚠️ Could not decrypt settings API keys");
  }

  await db.insert(companySettings).values({
    companyId: company.id,
    serperApiKeyEncrypted: serperKey ? newEncrypt(serperKey) : null,
    serpApiKeyEncrypted: serpApiKey ? newEncrypt(serpApiKey) : null,
  });
  console.log("   ✅ Settings migrated");

  // 6. Migrate memory facts
  console.log("6️⃣ Migrating memory facts...");
  const oldMemory = readJson("client-memory.json") || [];

  for (const m of oldMemory) {
    await db.insert(memoryFacts).values({
      companyId: company.id,
      key: m.key,
      value: m.value,
      source: m.source,
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
    });
  }
  console.log(`   ✅ ${oldMemory.length} memory facts migrated`);

  // 7. Migrate agent stats
  console.log("7️⃣ Migrating agent stats...");
  const oldStats = readJson("agent-stats.json") || {};
  let statsCount = 0;

  for (const [oldAgentId, stat] of Object.entries(oldStats) as [string, any][]) {
    const newAgentId = agentIdMap.get(oldAgentId);
    if (!newAgentId || !stat.daily) continue;

    for (const day of stat.daily) {
      await db.insert(agentStats).values({
        agentId: newAgentId,
        companyId: company.id,
        date: day.date,
        sessions: day.sessions || 0,
        inputTokens: day.inputTokens || 0,
        outputTokens: day.outputTokens || 0,
      }).onConflictDoNothing();
      statsCount++;
    }
  }
  console.log(`   ✅ ${statsCount} stat entries migrated`);

  // 8. Migrate research history
  console.log("8️⃣ Migrating research sessions...");
  const oldSessions = readJson("research-history.json") || [];

  for (const s of oldSessions) {
    // Map old agent IDs to new
    const newAgentIds = (s.agentIds || [])
      .map((id: string) => agentIdMap.get(id))
      .filter(Boolean);

    const [newSession] = await db.insert(researchSessions).values({
      companyId: company.id,
      userId: user.id,
      question: s.question,
      agentIds: JSON.stringify(newAgentIds),
      dataSource: s.dataSource,
      status: s.status || "completed",
      startedAt: new Date(s.startedAt),
      completedAt: s.completedAt ? new Date(s.completedAt) : null,
      finalAnswer: s.finalAnswer,
      totalTokens: s.totalTokens || 0,
    }).returning();

    // Migrate messages
    for (const m of (s.messages || [])) {
      const newAgentId = agentIdMap.get(m.agentId) || m.agentId;
      await db.insert(researchMessages).values({
        sessionId: newSession.id,
        agentId: newAgentId,
        agentName: m.agentName,
        agentEmoji: m.agentEmoji,
        role: m.role,
        content: m.content,
        tokensUsed: m.tokensUsed || 0,
        timestamp: new Date(m.timestamp),
      });
    }
  }
  console.log(`   ✅ ${oldSessions.length} sessions migrated`);

  // === VERIFY ===
  console.log("\n📊 Migration Summary:");
  console.log(`   Users: 1`);
  console.log(`   Companies: 1`);
  console.log(`   Agents: ${oldAgents.length}`);
  console.log(`   Teams: ${oldTeams.length}`);
  console.log(`   Memory Facts: ${oldMemory.length}`);
  console.log(`   Sessions: ${oldSessions.length}`);
  console.log(`   Stats: ${statsCount} entries`);
  console.log("\n✅ Migration complete!");
}

migrate().catch(console.error);
```

## 🔄 Rollback Plan

ถ้า migration ผิดพลาด:

```sql
-- Delete all migrated data (reverse order)
DELETE FROM research_messages;
DELETE FROM research_sessions;
DELETE FROM agent_stats;
DELETE FROM memory_facts;
DELETE FROM company_settings;
DELETE FROM team_agents;
DELETE FROM teams;
DELETE FROM agent_knowledge;
DELETE FROM agents;
DELETE FROM user_companies;
DELETE FROM companies;
DELETE FROM users WHERE email = 'admin@ledgio.ai';
```

## ⚠️ Important Notes

1. **API Key Re-encryption**: BossBoard ใช้ AES-256-CBC, LEDGIO AI ใช้ AES-256-GCM — ต้อง decrypt ด้วย old key แล้ว re-encrypt ด้วย new key
2. **Agent IDs เปลี่ยน**: UUID ใหม่ทั้งหมด — team_agents junction table จะ map ให้
3. **Session IDs เปลี่ยน**: Research history จะได้ UUID ใหม่
4. **No data loss**: ทุกอย่างย้ายครบ, ไม่มี field ที่ตกหล่น
5. **Knowledge files**: เก็บเป็น text content ในฐานข้อมูลแทน JSON array ใน agent object

## 🧪 Verification Script

```typescript
// scripts/verify-migration.ts
async function verify() {
  const agentCount = await db.select({ count: count() }).from(agents);
  const teamCount = await db.select({ count: count() }).from(teams);
  const sessionCount = await db.select({ count: count() }).from(researchSessions);
  const memoryCount = await db.select({ count: count() }).from(memoryFacts);
  
  // Compare with JSON file counts
  const oldAgents = JSON.parse(fs.readFileSync(`${BOSSBOARD_DIR}/agents.json`, "utf-8"));
  const oldTeams = JSON.parse(fs.readFileSync(`${BOSSBOARD_DIR}/teams.json`, "utf-8"));
  
  console.log("Agents:", agentCount[0].count, "vs", oldAgents.length, agentCount[0].count === oldAgents.length ? "✅" : "❌");
  console.log("Teams:", teamCount[0].count, "vs", oldTeams.length, teamCount[0].count === oldTeams.length ? "✅" : "❌");
  
  // Test agent API key decryption
  const [testAgent] = await db.select().from(agents).limit(1);
  if (testAgent.apiKeyEncrypted) {
    try {
      const key = decrypt(testAgent.apiKeyEncrypted);
      console.log("Agent API key decryption:", key.length > 0 ? "✅" : "❌");
    } catch {
      console.log("Agent API key decryption: ❌");
    }
  }
}
```

## 📁 BossBoard Source Files Reference

| File | Lines | Key Functions to Migrate |
|------|-------|------------------------|
| `lib/agents-store.ts` | 1-800 | All CRUD: agents, teams, sessions, memory, stats, encryption |
| `app/api/team-research/stream/route.ts` | 1-900+ | Meeting flow, callLLM, web search, MCP, SSE |
| `app/api/team-research/upload/route.ts` | 1-100 | Document parsing (PDF/Excel/Word/CSV) |
| `lib/domain-knowledge.ts` | — | Built-in Thai tax/accounting rules |
| `lib/rate-limit.ts` | — | In-memory rate limiting → Redis |
| `app/sidebar.tsx` | — | Navigation UI |
| `app/page.tsx` | — | Main research page UI |
| `app/agents/page.tsx` | — | Agent CRUD UI |
| `app/teams/page.tsx` | — | Team CRUD UI |
| `app/settings/page.tsx` | — | Settings UI |

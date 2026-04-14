# LEDGIO AI — Multi-Tenant Architecture

> Multi-Company / Multi-Tenant design สำหรับขายเป็นแพ็คเกจให้เจ้าของธุรกิจหลายบริษัท

## 🎯 Business Requirement

- ผู้ใช้แต่ละคนสร้างได้ **หลายบริษัท** (Company)
- แต่ละบริษัทมี agents, teams, sessions, memory, stats, settings แยกอิสระ
- ผู้ใช้สลับบริษัทได้ทันที (Company Switcher)
- เจ้าของธุรกิจเชิญพนักงานเข้าบริษัทได้ (Invitation)
- ข้อมูลข้ามบริษัทมองไม่เห็นกัน (Data Isolation)

## 🏗️ Tenancy Strategy

**Shared Database, Row-Level Isolation** — ข้อมูลทุกบริษัทอยู่ใน database เดียว แต่แยกด้วย `company_id` column

```
┌─────────────────────────────────────────┐
│           PostgreSQL Database            │
│                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Company A │ │Company B │ │Company C │ │
│  │agents: 5 │ │agents: 3 │ │agents: 8 │ │
│  │teams: 2  │ │teams: 1  │ │teams: 3  │ │
│  │sessions:N│ │sessions:N│ │sessions:N│ │
│  └──────────┘ └──────────┘ └──────────┘ │
│                                         │
│  All rows filtered by company_id        │
└─────────────────────────────────────────┘
```

### Why Shared DB?
- Server มี RAM 7.6 GB — ไม่เหมาะกับ database-per-tenant
- ง่ายในการ manage, backup, migrate
- เพียงพอสำหรับ 100+ companies ใน Single Instance
- เมื่อ scale ถึงจุด สามารถ shard by company_id ภายหลัง

## 📊 Data Hierarchy

```
User (ผู้ใช้)
 ├── Company A (owner)
 │    ├── Agents (5 ตัว)
 │    │    └── Knowledge (เอกสารต่อ agent)
 │    ├── Teams (2 ทีม)
 │    │    └── TeamAgents (junction)
 │    ├── Research Sessions
 │    │    └── Research Messages
 │    ├── Memory Facts
 │    ├── Agent Stats
 │    └── Company Settings (API keys, preferences)
 │
 ├── Company B (owner)
 │    ├── Agents (3 ตัว)
 │    └── ... (same structure)
 │
 └── Company C (member — invited by someone else)
      └── ... (read/write based on role)
```

## 🔄 Company Switching Flow

### UI Flow
1. **Sidebar** แสดง company switcher (dropdown/modal)
2. User เลือกบริษัท → POST `/api/companies/switch`
3. Server set cookie `ledgio-active-company={companyId}`
4. Page reload / client state update
5. ทุก subsequent request ใช้ companyId จาก cookie

### Cookie-Based Active Company

```typescript
// POST /api/companies/switch
export async function POST(req: Request) {
  const { companyId } = await req.json();
  const user = await requireAuth();
  
  // Verify user has access to this company
  await requireCompanyAccess(companyId, "viewer");
  
  // Set cookie
  const response = Response.json({ ok: true });
  response.headers.set("Set-Cookie", 
    `ledgio-active-company=${companyId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60*60*24*365}`
  );
  return response;
}
```

### Context Injection Pattern

ทุก API route ใช้ helper `getCompanyContext()` เพื่อดึง userId + companyId:

```typescript
// ตัวอย่าง: GET /api/agents
export async function GET() {
  const { userId, companyId } = await getCompanyContext();
  
  const agents = await db
    .select()
    .from(agentsTable)
    .where(
      and(
        eq(agentsTable.companyId, companyId),
        isNull(agentsTable.deletedAt)
      )
    );
  
  return Response.json(agents);
}
```

## 👥 User-Company Relationships

### Create Company

```typescript
// POST /api/companies
export async function POST(req: Request) {
  const user = await requireAuth();
  const body = await req.json();
  
  // Limit: max 10 companies per user (configurable)
  const userCompanyCount = await db
    .select({ count: count() })
    .from(userCompanies)
    .where(eq(userCompanies.userId, user.id));
  
  if (userCompanyCount[0].count >= 10) {
    return Response.json({ error: "Maximum companies reached" }, { status: 400 });
  }
  
  const result = await db.transaction(async (tx) => {
    const [company] = await tx.insert(companies).values({
      name: body.name,
      businessType: body.businessType,
      accountingStandard: body.accountingStandard,
      fiscalYear: body.fiscalYear,
      employeeCount: body.employeeCount,
      notes: body.notes,
    }).returning();
    
    await tx.insert(userCompanies).values({
      userId: user.id,
      companyId: company.id,
      role: "owner",
      isDefault: false,
    });
    
    // Create default company settings
    await tx.insert(companySettings).values({
      companyId: company.id,
    });
    
    return company;
  });
  
  return Response.json(result, { status: 201 });
}
```

### Invite Member

```typescript
// POST /api/companies/:id/invite
// Body: { email: string, role: "admin" | "member" | "viewer" }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { user } = await requireCompanyAccess(params.id, "admin");
  const { email, role } = await req.json();
  
  // Find or create placeholder user
  let [invitee] = await db.select().from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  
  if (!invitee) {
    // Create inactive user — will be activated on registration
    [invitee] = await db.insert(users).values({
      email: email.toLowerCase(),
      isActive: false,
    }).returning();
  }
  
  // Add to company
  await db.insert(userCompanies).values({
    userId: invitee.id,
    companyId: params.id,
    role: role,
    isDefault: false,
  }).onConflictDoNothing();
  
  // TODO: Send invitation email
  
  return Response.json({ ok: true });
}
```

### List User's Companies

```typescript
// GET /api/companies
export async function GET() {
  const user = await requireAuth();
  
  const result = await db
    .select({
      company: companies,
      role: userCompanies.role,
      isDefault: userCompanies.isDefault,
    })
    .from(userCompanies)
    .innerJoin(companies, eq(userCompanies.companyId, companies.id))
    .where(
      and(
        eq(userCompanies.userId, user.id),
        isNull(companies.deletedAt)
      )
    )
    .orderBy(desc(userCompanies.isDefault), asc(companies.name));
  
  return Response.json(result);
}
```

## 🔒 Data Isolation Rules

### CRITICAL — Every Query Must Be Scoped

```typescript
// ❌ WRONG — No company filter
const agents = await db.select().from(agentsTable);

// ✅ CORRECT — Always filter by companyId
const agents = await db.select().from(agentsTable)
  .where(eq(agentsTable.companyId, companyId));
```

### Scoped Entities (ต้องมี companyId ทุก query)

| Entity | Scope Level |
|--------|------------|
| Agents | per company |
| Agent Knowledge | per company + per agent |
| Teams | per company |
| Team Agents | per company (via team) |
| Research Sessions | per company + per user |
| Research Messages | per session (via session scope) |
| Memory Facts | per company |
| Agent Stats | per company + per agent |
| Company Settings | per company |
| Audit Logs | per company |

### Global Entities (ไม่มี companyId)

| Entity | Why Global |
|--------|-----------|
| Users | User สามารถอยู่หลาย company |
| Accounts (OAuth) | Linked to user, not company |
| Sessions (Auth) | Linked to user, not company |

## 🎨 Company Switcher UI

### Sidebar Component

```tsx
// components/company-switcher.tsx
function CompanySwitcher() {
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  
  return (
    <div className="company-switcher">
      {/* Current company display */}
      <button onClick={() => setOpen(!open)}>
        <span>{activeCompany?.name}</span>
        <ChevronDown />
      </button>
      
      {/* Dropdown */}
      {open && (
        <div className="dropdown">
          {companies.map(c => (
            <button key={c.id} onClick={() => switchCompany(c.id)}>
              {c.name}
              {c.role === "owner" && <Crown size={12} />}
            </button>
          ))}
          <hr />
          <button onClick={() => router.push("/companies/new")}>
            <Plus /> สร้างบริษัทใหม่
          </button>
        </div>
      )}
    </div>
  );
}
```

### Sidebar Layout

```
┌─────────────────────┐
│ 🏢 สำนักงาน A  ▼   │ ← Company Switcher
├─────────────────────┤
│ 🏠 Dashboard        │
│ 💬 Meeting Room     │
│ 🤖 Agents           │
│ 👥 Teams            │
│ 📊 Statistics       │
│ 📋 History          │
│ ⚙️ Settings         │
├─────────────────────┤
│ 👤 User Name        │
│ 🚪 Logout           │
└─────────────────────┘
```

## 🔄 Cross-Company Queries (Future)

สำหรับเจ้าของหลายบริษัท อาจต้องการ:
- **สรุป token usage รวมทุกบริษัท**
- **ค้นหา session ข้ามบริษัท**

Implementation:
```typescript
// GET /api/dashboard/overview?scope=all
// Returns merged stats from all companies user has access to
const userCompanyIds = await db.select({ companyId: userCompanies.companyId })
  .from(userCompanies)
  .where(eq(userCompanies.userId, user.id));

const stats = await db.select()
  .from(agentStats)
  .where(inArray(agentStats.companyId, userCompanyIds.map(c => c.companyId)));
```

## ⚠️ Migration Strategy from BossBoard

BossBoard ปัจจุบันไม่มี company concept — ทุกอย่าง global:

1. **สร้าง "Default Company"** สำหรับ first user
2. **ย้ายข้อมูลเดิมทั้งหมด** เข้า Default Company
3. **ผู้ใช้สร้างบริษัทใหม่** → agents/teams ว่าง, ต้องตั้งค่าใหม่
4. **ไม่ copy agents ข้ามบริษัท** — แต่สามารถ "clone agent" ได้ (future feature)

## 📐 Database Migration Example

```sql
-- Add company_id to agents table
ALTER TABLE agents ADD COLUMN company_id UUID REFERENCES companies(id);

-- Create default company for migration
INSERT INTO companies (id, name) VALUES ('default-uuid', 'Default Company');

-- Migrate existing agents
UPDATE agents SET company_id = 'default-uuid' WHERE company_id IS NULL;

-- Make company_id NOT NULL after migration
ALTER TABLE agents ALTER COLUMN company_id SET NOT NULL;

-- Add index
CREATE INDEX agents_company_idx ON agents(company_id);
```

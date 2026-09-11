# How to read this codebase

Use this file if you are leaving Cursor and need to understand the app by reading files yourself.

This is a Next.js 15 (App Router) app. There is **no separate backend server** and **no REST API folder**. The “backend” is:

- **Prisma** talking to **Supabase PostgreSQL**
- **Server Actions** in `lib/actions/` (functions the browser can call)
- **Pure math** in `lib/calculations.ts`

Companion docs (do not skip these later):

| File | Use it for |
|------|------------|
| `CODE_READING.md` (this file) | How to walk the code |
| `HANDOFF.md` | How to run it, accounts, deploy, known risks |
| `DATA_FLOW.md` | Which page reads which table |
| `STUDY_PLAN.md` | TypeScript/React syntax used in *this* repo |
| `prisma/schema.prisma` | The real data model |

`README.md` is outdated. It still describes the early mock-data prototype. Ignore it for architecture.

---

## 0. The one picture you need

Every screen follows the same three-layer pattern:

```
Browser UI  ("use client" components)
    ↑ props (already-shaped data)
    ↓ function calls (saveShipment, saveExpense, …)
Server page / Server Action
    ↓ Prisma
Supabase Postgres
```

**Layer 1 — Frontend (UI)**  
`app/` pages + `components/`. What the user sees, forms, tables, buttons.

**Layer 2 — FE–BE integration**  
Server pages load data. Client forms call Server Actions. Mappers convert database rows into UI types.

**Layer 3 — Backend logic**  
Payout formulas, filters, auth checks. Most money math is in `lib/calculations.ts`. Saving a shipment *also* calculates, then stores the result as a snapshot.

If you remember only one rule: **screens do not talk to the database**. They talk to queries (read) and actions (write). Queries and actions talk to Prisma.

---

## 1. Frontend (UI) — how to read it

### 1.1 Start from the routes, not from `lib/`

Next.js App Router: a file under `app/` **is** a URL.

| URL | File | What you see |
|-----|------|----------------|
| `/login` | `app/login/page.tsx` | Sign-in form |
| `/` | `app/page.tsx` | Admin master dashboard (employees are bounced to New Shipment) |
| `/employee/shipments/new` | `app/employee/shipments/new/page.tsx` | New shipment form |
| `/employee/profile` | `app/employee/profile/page.tsx` | Profile & earnings |
| `/admin/employees` | `app/admin/employees/page.tsx` | Employee roster |
| `/admin/employees/[id]` | `app/admin/employees/[id]/page.tsx` | One employee + payout ledger |
| `/admin/expenses` | `app/admin/expenses/page.tsx` | Expense log |
| `/admin/routes` | `app/admin/routes/page.tsx` | Rate sheets |
| `/admin/shipments` | `app/admin/shipments/page.tsx` | Redirects to `/` |

Navbar links live in `components/Navbar.tsx`. That file is the menu map.

Shell (navbar + page padding) is `components/AppShell.tsx`, wrapped around signed-in pages by `app/layout.tsx`.

### 1.2 Pages are thin. Views are fat.

A typical page looks like this (`app/page.tsx`):

1. Fetch data with `lib/queries/*`
2. Pass it as `initial*` props into a client view

The actual table, filters, and buttons are in `components/views/` or `components/forms/`.

**Read order for any screen:**

1. `app/.../page.tsx` — what data is loaded
2. The view it renders — what the user can click
3. Only then jump into `lib/`

Do not start in `lib/mockData.ts`. That file is mostly **TypeScript types** plus leftover seed arrays. Live data comes from the database.

### 1.3 `"use client"` vs server files

- Files with `"use client"` at the top run in the browser. They can use `useState`, `onClick`, `onSubmit`.
- Files without it are Server Components. They can `await` the database. They cannot use hooks or click handlers.

Almost every *interactive* screen is: **server page → client view**.

### 1.4 Role vs login

Real permission comes from Supabase Auth + a `Profile` row (`lib/auth.ts`).

`context/RoleContext.tsx` is **not** security. It stores:

- Who is signed in (`email`, `currentUserId`)
- Whether they are an admin
- A **view toggle** so an admin can preview the employee screens

Employees cannot switch to admin in that toggle. Server Actions still call `requireAdmin()` / `requireUser()` on the server, so the toggle cannot grant extra power.

### 1.5 Suggested UI reading order (first afternoon)

Read these in this order. After each file, click the matching screen in the running app.

1. `components/Navbar.tsx` — every page that exists
2. `components/LoginScreen.tsx` — a simple form
3. `components/ui/PageHeader.tsx` and `components/ui/Badge.tsx` — small presentational pieces
4. `components/forms/ShipmentInputForm.tsx` — the most important UI (long, but one form)
5. `components/views/AdminMasterDashboard.tsx` — the main admin table
6. `components/views/AdminEmployeesOverview.tsx` then `AdminEmployeeDetail.tsx`
7. `components/views/AdminExpenses.tsx`
8. `app/admin/routes/page.tsx` — mostly a server-rendered table plus two panels

When a view file feels huge, search inside it for:

- `return (` — that is the JSX (what is drawn)
- `useState` — local UI state
- `await save` / `await update` / `await delete` — where it talks to the server

### 1.6 What you can ignore at first

- `components/ui/*` styling helpers
- `components/admin/*FiltersBar.tsx` until you need filters
- `lib/exportShipments.ts` / `lib/exportExpenses.ts` until you need Excel export
- `lib/destinationRates.generated.ts` — generated rate sheet, not logic

---

## 2. FE–BE integration — forms, saving, reading

This is the layer that confuses people, because Next.js hides the network call.

### 2.1 Reading data (page load)

Pattern:

```
app/.../page.tsx
  → lib/queries/*.ts          (Prisma findMany / findUnique)
    → lib/mappers/*.ts        (DB row → UI type)
      → client component prop
```

Example: home page

- `app/page.tsx` calls `getShipments()`, `getEmployees()`, `getTrucks()`, `getClients()`, `getDestinationRoutes()`
- Those live in `lib/queries/`
- `getShipments()` uses `mapShipmentLogToShipment` in `lib/mappers/shipmentLog.ts`
- `HomePageClient` either redirects employees or renders `AdminMasterDashboard`

**Mapper rule:** by the time a component sees a `Shipment` or `Employee`, most database `null`s have become `""`. See `DATA_FLOW.md` section 3 if a field looks empty and you cannot tell why.

### 2.2 Saving data (forms)

There is no `/api/shipments`. The form imports a function marked `"use server"`.

Example: new shipment

1. User fills `components/forms/ShipmentInputForm.tsx`
2. `handleSubmit` calls `saveShipment({ ... })` from `lib/actions/shipment.ts`
3. That function:
   - checks the signed-in user (`requireUser`)
   - validates required fields
   - looks up Client / Truck / Employee in Prisma
   - **calculates payouts**
   - `prisma.shipmentLog.create(...)`
   - `revalidatePath("/")` so the dashboard reloads fresh data
4. The form checks `result.success` and shows an error or a success banner

Same pattern everywhere:

| UI | Action file | Function |
|----|-------------|----------|
| Login form | `lib/actions/auth.ts` | `signIn`, `signOut` |
| New shipment | `lib/actions/shipment.ts` | `saveShipment` |
| Dashboard flag / edit / delete | `lib/actions/shipment.ts` | `toggleShipmentFlag`, `updateShipment`, `deleteShipment` |
| Employee remarks / bounty tag | `lib/actions/employee.ts` | `updateEmployeeRemarks`, `updateEmployeeBountyExp` |
| Record cash payout | `lib/actions/payment.ts` | `recordSalaryPayment` |
| Expenses | `lib/actions/expense.ts` | `saveExpense`, `updateExpense`, `toggleExpenseFlag`, `deleteExpense` |
| Livestock / platform rates | `lib/actions/client.ts` | `createLivestockClient`, `updateLivestockRates`, `createLivestockRoute`, `createPlatformClient`, `updatePlatformRates` |

### 2.3 How to trace one save yourself

Pick a button. Then:

1. In the component, find the `onSubmit` / `onClick` handler.
2. Note the imported function (`saveShipment`, `saveExpense`, …).
3. Open that file in `lib/actions/`. It always starts with `"use server"`.
4. Read top to bottom: auth → validate → lookup related rows → write → `revalidatePath`.
5. Open `prisma/schema.prisma` and find the model being written (`ShipmentLog`, `Expense`, …).

That is the whole integration. If you can do it for `saveShipment`, you can do it for every other form.

### 2.4 Auth on the way in

Request path:

1. `middleware.ts` — no cookie, go to `/login`; already signed in on `/login`, go to `/`
2. `app/layout.tsx` — `getSessionUser()`; if logged in, wrap with `RoleProvider` + `AppShell`
3. Server Actions — `requireUser()` or `requireAdmin()` as the first real statement

Accounts are **not** created in the UI. Provisioning scripts:

- `scripts/provision-user.ts` — one office/admin user
- `scripts/provision-employees.ts` — driver/helper logins

Details are in `HANDOFF.md`.

### 2.5 Two shapes of the same thing (important)

The database uses Prisma names (`fullName`, `routeName`, `isFlagged`, `calcType`).

The UI uses older type names in `lib/mockData.ts` (`name`, `farthestRoute`, `flagged`, `calculationType`).

`lib/mappers/` is the translation layer. When a column “is missing” on screen, check the mapper before you check the schema.

### 2.6 Suggested integration reading order

1. `middleware.ts` + `lib/auth.ts` + `lib/actions/auth.ts`
2. `lib/prisma.ts` (how the DB client is created)
3. `lib/queries/shipments.ts` + `lib/mappers/shipmentLog.ts`
4. `lib/actions/shipment.ts` — start at `saveShipment`, then `resolvePayout`
5. `lib/actions/expense.ts` — shorter, same shape
6. `prisma/schema.prisma` — models `ShipmentLog`, `Client`, `DestinationRoute`, `Employee`, `Expense`, `SalaryPayment`, `Profile`

---

## 3. Backend logic — calculations and other rules

### 3.1 Where money is decided

**Source of truth for the formula:** `lib/calculations.ts`

Four functions, one per client type:

| Client type (UI) | Prisma `calcType` | Function | Formula in words |
|------------------|-------------------|----------|------------------|
| Destination (Pepsi, Big Mak, Roadwise) | `DESTINATION` | `calculateDestinationPayout` | Look up route row → driver/helper/extra helper base rates |
| Livestock (Charoen, …) | `ANIMAL_HEADCOUNT` | `calculateLivestockPayout` | `base + heads × per-head rate` (per role) |
| Platform (Mobers, …) | `PLATFORM` | `calculatePlatformPayout` | `(rate − rate × share) × role rate` |
| Weight (Bounty) | `WEIGHT` | `calculateWeightPayout` | Pick a column from the kg-tier row using old/new bounty experience; same-driver rate if helper is a driver |

These functions are **pure**: numbers in, numbers out, no database. That is why the form can preview payouts in the browser *and* the server can recalculate on save.

### 3.2 Preview vs saved number

On the form (`ShipmentInputForm.tsx`):

- A `useMemo` named `payoutPreview` calls the same `calculate*` functions
- That is **display only**

On save (`lib/actions/shipment.ts` → `resolvePayout`):

- Livestock / Weight / Platform rates are loaded from **Postgres** (`DestinationRoute` and `Client`)
- Destination (Pepsi / Big Mak / Roadwise) still uses the **static** tables in `lib/rates.ts`
- The computed pesos are stored on `ShipmentLog` as `driverPayout`, `helperPayout`, `extraHelperPayout`

Later, dashboards prefer those stored snapshots (`lib/payout.ts` → `getEmployeePayoutForShipment`). Changing a rate sheet later does **not** rewrite old shipments.

**Known trap:** `/admin/routes` shows destination rates from the **database**. Destination *payout on save* still reads `lib/rates.ts`. Editing a Pepsi rate in Supabase can change the admin table without changing what a new Pepsi shipment pays. Livestock, platform, and Bounty already use the DB on save.

### 3.3 Other “backend” files that are not the database

| File | What it does |
|------|----------------|
| `lib/payout.ts` | Totals, employee earnings, payout ledger (earned vs cash paid) |
| `lib/shipmentFilters.ts` | Dashboard filter logic |
| `lib/expenseFilters.ts` | Expense page filter logic |
| `lib/livestock.ts` | Head-count parsing (1–200) |
| `lib/platform.ts` | Platform rate parsing; percent ↔ fraction |
| `lib/weight.ts` | Bounty kg tiers and `oldbounty` / `newbounty` |
| `lib/clients.ts` | Client type helpers; also a **static** client list used by `isDestinationClient()` |
| `lib/rates.ts` | Static destination rate sheet + lookup helpers |

When a payout looks wrong:

1. Confirm the client’s `calcType` in the database (or on Routes & Rates).
2. Read the matching function in `lib/calculations.ts`.
3. Read `resolvePayout` in `lib/actions/shipment.ts` to see which rates were loaded.
4. Only then look at the form preview — it can disagree if it used a different rate source.

### 3.4 Suggested calculation reading order

1. `lib/calculations.ts` — all four formulas, comments included
2. `resolvePayout` inside `lib/actions/shipment.ts`
3. The `payoutPreview` `useMemo` in `ShipmentInputForm.tsx`
4. `getEmployeePayoutForShipment` and `buildPayoutLedger` in `lib/payout.ts`
5. `prisma/schema.prisma` models `Client` and `DestinationRoute`

Work one client type at a time. Do Pepsi (destination) last; it is the one still split between static files and the database.

---

## 4. A worked walk: “what happens when I save a Charoen trip?”

Use this as a template for any other feature.

1. **UI** — `/employee/shipments/new` → `ShipmentInputForm`
   - Client dropdown comes from `getClients()` (database)
   - Route dropdown comes from `routes` filtered to that client
   - Head count field appears because `isLivestockClient(selectedClient)`
   - Preview calls `calculateLivestockPayout`

2. **Submit** — `saveShipment(...)` in `lib/actions/shipment.ts`
   - `requireUser()`
   - `resolveClient("Charoen")` → Prisma `Client`
   - `calcType === "ANIMAL_HEADCOUNT"` branch of `resolvePayout`
   - Loads `DestinationRoute` for that client + route name
   - `calculateLivestockPayout({ pighead, driverBase, helperBase, driverRate, helperRate, hasExtraHelper })`

3. **Write** — `prisma.shipmentLog.create` with snapshot payouts

4. **Read back** — admin dashboard `getShipments()` → mapper → table row. Employee profile uses `lib/payout.ts` to show that person’s share.

If you can narrate those four steps without looking, you understand the app’s spine.

---

## 5. Folder map (keep this nearby)

```
app/                      URLs (server pages)
components/
  forms/                  Shipment input
  views/                  Dashboards, employee, expenses
  admin/                  Modals, filter bars, rate panels
  ui/                     Small visual pieces
context/RoleContext.tsx   Signed-in user + admin preview toggle
lib/
  actions/                Writes (Server Actions)
  queries/                Reads (Prisma)
  mappers/                DB → UI types
  calculations.ts         Payout formulas
  payout.ts               Earnings / ledger on top of snapshots
  auth.ts                 Who is signed in
  prisma.ts               Database client
  supabase/               Auth clients
  mockData.ts             UI types (name is historical)
prisma/schema.prisma      Tables
prisma/seed.ts            Seed script
scripts/                  Provision users, generate rates, apply RLS
middleware.ts             Login gate
```

`@/` in imports means the project root (`tsconfig.json` → `"@/*": ["./*"]`).  
`@/lib/auth` is `lib/auth.ts`.

---

## 6. What else you need

### 6.1 Access (or you cannot run or change anything)

- **GitHub** — repo `megumiihan/Bayani-trucking`
- **Vercel** — production deploy; env vars live there separately from your laptop `.env`
- **Supabase** — database + Auth (Singapore project; see `HANDOFF.md`)
- A local `.env` copied from `.env.example` with all five keys filled in
- Provisioned login emails (no public signup)

Without Supabase + `.env`, `npm run dev` will show login but cannot save or load real data.

### 6.2 Software on your machine

- Node.js (the version Vercel uses; 20+ is safe)
- npm
- Git
- A code editor (VS Code is enough)
- A browser with DevTools

Useful extras, not required:

- [Prisma Studio](https://www.prisma.io/studio) — `npm run db:studio` to click through tables
- Supabase dashboard → Table Editor / SQL / Auth users
- [Next.js App Router docs](https://nextjs.org/docs/app)
- [Prisma schema docs](https://www.prisma.io/docs/orm/prisma-schema)

### 6.3 Concepts to know (small list)

You do **not** need Express, Redux, or a separate API course.

You do need:

1. React: components, props, `useState`, `useMemo`, forms
2. TypeScript: `interface`, unions (`"admin" | "employee"`), `?.`, `??`
3. Next.js App Router: `app/page.tsx` = route; Server Components vs `"use client"`
4. Server Actions: `"use server"` functions imported into client forms
5. Prisma: `findMany` / `create` / `update` against models in `schema.prisma`

`STUDY_PLAN.md` drills the exact syntax this repo uses. Keep using it even without Cursor.

### 6.4 How to find things without an AI chat

In the editor or GitHub search:

| I want to know… | Search for |
|-----------------|------------|
| What the save button calls | `saveShipment` or `"use server"` |
| Where a table is read | `prisma.shipmentLog` / `prisma.expense` |
| Where pesos are computed | `calculateLivestockPayout` / `calculateWeightPayout` |
| Where a URL is defined | `app/admin/expenses/page.tsx` |
| Who is allowed to do this | `requireAdmin` / `requireUser` |
| Why a field is blank | `mapEmployeeToUi` / `mapShipmentLogToShipment` |

Always search **the function name**, not the screen title.

### 6.5 How to confirm you understood a change

1. Run `npm run dev` and click the screen.
2. Submit the form / toggle the flag / record the payout.
3. Open Prisma Studio or Supabase Table Editor and look at the row.
4. Reload the other screens that show the same data (dashboard, employee detail, profile).

A UI-only change can look fine and still fail on save. Always check the table.

### 6.6 Business rules you will not find in code comments

The code implements rates; it does not explain *why* Pepsi uses distance bands or why Bounty has old/new bounty tags. Keep:

- The original Excel / rate sheets (Pepsi, Big Mak, Roadwise, Bounty, livestock, platform)
- A short note of who in the office owns each client’s rates
- Login list / password reset process (Supabase dashboard; `@bayanitrucking.local` emails cannot receive reset mail)

If a payout dispute happens, compare: rate sheet → `lib/calculations.ts` → stored `ShipmentLog` snapshot.

### 6.7 Things this repo still fakes or splits

Do not assume every field on screen is a database column.

- Employee address, employee number, emergency contact — empty strings in the mapper; no columns
- `payoutStatus` — hardcoded `"Pending"`
- `tenureStatus` — `"new"` or `"inactive"` from `isActive` only
- Destination payout math — static `lib/rates.ts`, while the Routes page reads the DB
- `isDestinationClient()` — still uses the static list in `lib/clients.ts`

Full list: `HANDOFF.md` “Still mock / static” and `DATA_FLOW.md`.

### 6.8 After Cursor: a practical weekly habit

1. Pick **one screen**.
2. Read page → view → action → schema (the three layers).
3. Change something tiny yourself (label, filter, validation message) and verify in the browser **and** the database.
4. Keep an error journal: message, your guess, actual cause.

You do not need Cursor to read this app. You need the running site, the schema, and the habit of tracing one button at a time.

---

## 7. First week plan (no Cursor)

| Day | Read | Do in the app |
|-----|------|----------------|
| 1 | Navbar, login, layout, middleware | Sign in as admin and as employee; note which links appear |
| 2 | New shipment form + `saveShipment` + `ShipmentLog` in schema | Create one test shipment; find the row in Prisma Studio |
| 3 | `lib/calculations.ts` + `resolvePayout` | Repeat for one livestock, one platform, one Bounty, one Pepsi trip |
| 4 | Admin dashboard + flag/edit/delete actions | Flag and edit the test row; confirm the table |
| 5 | Expenses page + `lib/actions/expense.ts` | Log one expense |
| 6 | Employee detail + `lib/payout.ts` ledger + `recordSalaryPayment` | Record a payout; see earned vs paid |
| 7 | Routes page + `lib/actions/client.ts` | Change a livestock or platform rate; see whether a *new* shipment uses it |

After that week you should be able to answer, without help: *where does this number come from, and which file writes it?*

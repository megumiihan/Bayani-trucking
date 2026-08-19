# Bayani Trucking — Handoff

Last updated: 2026-08-19

## Quick start

```bash
npm install
cp .env.example .env   # if needed; set DATABASE_URL to Supabase Postgres
npm run db:push
npm run db:seed        # loads mock employees, trucks, clients, routes, shipments
npm run dev
```

Open http://localhost:3000. Use the **Employee / Admin** toggle in the navbar (prototype auth, not real login).

**Verify build:** `npx tsc --noEmit`, `npm run lint`, `npm run build` — all pass as of last check.

---

## Git state

| Item | Value |
|------|-------|
| Branch | `main` → `origin/main` (github.com/megumiihan/Bayani-trucking) |
| Remote | **Ahead of `origin/main`** — needs `git push` |
| Uncommitted | None as of last update |

### Supabase account was replaced on 2026-08-19

The previous project's credentials stopped authenticating. A new Supabase project was
created, `DATABASE_URL` in `.env` was repointed at it, and the schema was pushed and
seeded from scratch. `.env` is gitignored, so a new environment needs its own copy.

Verified after the switch: `npm run db:seed` reports 6 clients, 15 employees, 11 trucks,
**75 routes**, 7 shipments. If the route count comes back as 63, the widened
`DestinationRoute` unique constraint did not apply — see Schema notes.

### Cleanup (not urgent)

- Delete nested repo: `Bayani-trucking/.git` (empty nested git dir; breaks `git add .` if hit)
- `prisma/schema.prisma` has a commented-out `directUrl` line left from the Supabase
  reconnect; delete it if it isn't needed.

---

## Architecture

**Pattern:** Server pages fetch via `lib/queries/*` → pass `initial*` props to client components → mutations via server actions in `lib/actions/*` → mappers in `lib/mappers/*` translate Prisma shapes to UI types in `lib/mockData.ts`.

**Database:** Supabase PostgreSQL via Prisma (`prisma/schema.prisma`).

**Auth:** Prototype only — `context/RoleContext.tsx` role toggle. No Supabase Auth yet.

---

## What's wired to the database

| Feature | Read | Write |
|---------|------|-------|
| Admin master dashboard (`/`) | ✅ `getShipments()` | ✅ create (form), flag, edit |
| Employee profile (`/employee/profile`) | ✅ shipments + employees | — |
| Admin employees list + detail | ✅ employees + shipments | ✅ remarks (`updateEmployeeRemarks`) |
| New shipment form | ✅ employees + trucks + clients dropdowns | ✅ `saveShipment` |
| Routes & rates page (`/admin/routes`) | ✅ `getDestinationRoutes()` | — |
| Payout rate lookups (save + earnings) | ❌ `lib/rates.ts` (static/generated) | — |
| Login | ❌ prototype toggle only | — |

### Server actions

- `lib/actions/shipment.ts` — `saveShipment`, `toggleShipmentFlag`, `updateShipment`
- `lib/actions/employee.ts` — `updateEmployeeRemarks`

### Queries

- `lib/queries/shipments.ts` — `getShipments()`
- `lib/queries/employees.ts` — `getEmployees()`, `getEmployeeById()`
- `lib/queries/trucks.ts` — `getTrucks()`
- `lib/queries/clients.ts` — `getClients()`
- `lib/queries/routes.ts` — `getDestinationRoutes()`

### Two sources of truth for rates (known risk)

`/admin/routes` now displays `DestinationRoute` rows from the database, but every payout
calculation still reads the static `lib/rates.ts`:

- `lib/actions/shipment.ts` → `resolveShipmentRate` when saving a shipment
- `lib/payout.ts` → `resolveShipmentRate` when showing employee earnings

Editing a rate in Supabase therefore changes the admin page **without** changing what
drivers are paid, and nothing errors. Migrating these lookups is the next meaningful
step, and deserves tests on `lib/calculations.ts` first.

---

## Still mock / static

- **`lib/mockData.ts`** — TypeScript interfaces (`Shipment`, `Employee`) + seed source for employees/shipments. Runtime reads come from DB; types remain here.
- **`lib/clients.ts`** — `Client` type, `CalculationType` conversions, and seed array. The
  shipment form dropdown now reads the DB, but `isDestinationClient()` still consults the
  static array — and in `lib/actions/shipment.ts` it gates whether a shipment can be saved,
  so a DB-only client cannot be saved yet.
- **`lib/rates.ts` + `lib/destinationRates.generated.ts`** — Route pricing. Still the source
  for all payout math (see "Two sources of truth" above); `/admin/routes` reads the DB.
- **`lib/trucks.ts`** — Truck type + `formatTruckLabel()` + seed array. Runtime truck list from `getTrucks()`.
- **`lib/mockUsers.ts`** — Display names for `uploadedByUserId`; no users table.
- **`payoutStatus`** — Not in schema. Mapper hardcodes `"Pending"` in `lib/mappers/shipmentLog.ts`.
- **Employee profile fields** — `employeeNo`, address, emergency contact, etc. are empty strings in `mapEmployeeToUi`; only `fullName`, `role`, `isActive`, `remarks` come from DB.

---

## Schema notes

`Employee.remarks` and `ShipmentLog.extraHelperNote` are both `String?`.
`extraHelperNote` was previously merged into `remarks` on save;
`lib/mappers/shipmentRemarks.ts` splits legacy rows that still have both values joined
with `\n`.

`DestinationRoute` changed on 2026-08-19 so the table can hold the full rate sheet:

```prisma
model DestinationRoute {
  distance            String @default("")   // was String?
  extraHelperBaseRate Float                 // new

  @@unique([clientId, routeName, distance]) // was [clientId, routeName]
}
```

Why: Pepsi prices the same route at several distance bands, so `[clientId, routeName]`
could only hold 63 of the 75 static rows — `prisma/seed.ts` used to discard the other 12
silently. `distance` is non-nullable because Postgres treats `NULL`s as distinct in a
unique constraint, which would let duplicate area-priced routes through.

---

## Next steps (priority order)

1. **Push `main` to origin** — local is several commits ahead.
2. **Add tests for `lib/calculations.ts`** — pure input/output payout math, no DB needed.
   Nothing currently checks the money except manual review.
3. **Move payout rate lookups to the DB** — removes the two-sources-of-truth risk above.
   Do this after step 2.
4. **`isDestinationClient()` from the DB** — currently blocks saving any client that exists
   only in Supabase.
5. **Update `README.md`** — still says all data lives in `mockData.ts`.
6. **Real auth** — Supabase Auth before any production deployment. `ShipmentLog.createdById`
   currently stores a `lib/mockUsers.ts` id that points at no table.
7. **`payoutStatus`** — add DB column or remove from UI/export if not needed.
8. **Employee profile fields** — schema has no `employeeNo`, address, or emergency contact
   columns, and `tenureStatus` is derived from `isActive` alone, so every active employee
   renders as `"new"`.

---

## Risks

- **Rate drift:** `/admin/routes` and payout math read different sources — see above.
- **No automated tests** — `package.json` has no test script.
- **README outdated** — onboarding will assume mock-only architecture.
- **Nested `.git`** — can confuse git operations.
- **Client ID field** shows a raw uuid in the shipment form, and that value is what gets
  saved to `ShipmentLog.clientNumber`. The old human-readable codes (`CLI-PEPSI-001`) have
  no column in the `Client` table; add `clientCode` if they're wanted back.

---

## Key file map

```
app/                          Server pages (force-dynamic where DB-backed)
components/views/             Client dashboards and admin views
components/forms/             ShipmentInputForm
lib/actions/                  Server mutations
lib/queries/                  Prisma fetch helpers
lib/mappers/                  Prisma → UI type mappers
lib/mockData.ts               Shared TS types + seed data source
prisma/schema.prisma          Database schema
prisma/seed.ts                Seed script (npm run db:seed)
context/RoleContext.tsx       Prototype auth (keep)
```

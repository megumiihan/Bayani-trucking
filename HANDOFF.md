# Bayani Trucking — Handoff

Last updated: 2026-08-29

## Quick start

```bash
npm install
cp .env.example .env   # fill in from the Supabase dashboard
npm run db:push
npm run db:seed        # employees, trucks, clients, routes — no shipments
npm run dev
```

Open http://localhost:3000. You will be redirected to `/login`; sign in with a
provisioned account (see Accounts below). There is no signup page by design.

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

Current contents as of 2026-08-29: 15 employees, 6 clients, 75 routes, 16 profiles,
**0 shipments**. If the route count comes back as 63, the widened `DestinationRoute`
unique constraint did not apply — see Schema notes.

### Cleanup (not urgent)

- Delete nested repo: `Bayani-trucking/.git` (empty nested git dir; breaks `git add .` if hit)

---

## Accounts

Logins are created by script, never by signup, because each auth user also needs a
`Profile` row to carry its role. Creating one without the other produces a user who can
sign in but has no permissions.

```bash
npx tsx scripts/provision-user.ts admin@example.com 'password' admin
npx tsx scripts/provision-employees.ts            # dry run, prints the table
npx tsx scripts/provision-employees.ts --commit   # actually creates them
```

Both scripts skip accounts that already exist, so rerunning after a new hire only creates
the missing ones. Driver emails use the `@bayanitrucking.local` domain, which is not a
real domain — password resets by email will not work, and the office resets passwords
from the Supabase dashboard instead. Move to a domain you own if that becomes a problem.

---

## Architecture

**Pattern:** Server pages fetch via `lib/queries/*` → pass `initial*` props to client components → mutations via server actions in `lib/actions/*` → mappers in `lib/mappers/*` translate Prisma shapes to UI types in `lib/mockData.ts`.

**Database:** Supabase PostgreSQL via Prisma (`prisma/schema.prisma`).

**Auth:** Supabase Auth. `middleware.ts` refreshes the session and redirects signed-out
visitors to `/login`. `lib/auth.ts` exposes `getSessionUser` / `requireUser` /
`requireAdmin`, and every server action calls one of the last two. `context/RoleContext.tsx`
survives only as the admin's view-as-employee preview toggle; it no longer grants anything.

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
| Login | ✅ Supabase Auth + `Profile` | ✅ via provisioning scripts |

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
- **`lib/mockUsers.ts`** — Only a fallback now. Uploader names resolve through the
  `Profile` relation; this is consulted when a legacy row has no matching profile.
- **`payoutStatus`** — Not in schema. Mapper hardcodes `"Pending"` in `lib/mappers/shipmentLog.ts`.
- **Employee profile fields** — `employeeNo`, address, emergency contact, etc. are empty strings in `mapEmployeeToUi`; only `fullName`, `role`, `isActive`, `remarks` come from DB.

---

## Careful with DATABASE_URL in your shell

`prisma` loads `.env` with dotenv, which **does not override variables already set in the
environment**. So if a shell has ever run `source .env` (or `export DATABASE_URL=…`), every
later command in that shell keeps using the old value while appearing to use `.env`.

This bit us during the Singapore migration on 2026-08-30: `db:push`, `db:rls`, and
`db:seed` all ran against the old Frankfurt project after `.env` had already been
repointed. The seed wiped and rebuilt Frankfurt instead of Singapore. Nothing
unrecoverable was lost — that database held only seeded rows and zero shipments — but
`Profile.employeeId` is an optional relation, so deleting employees set all 15 driver
links to `NULL` rather than erroring.

`prisma/seed.ts` now prints its target host before clearing anything. Read that line.
To check a shell before running anything destructive:

```bash
env | grep -E '^(DATABASE_URL|DIRECT_URL)='   # expect no output
```

---

## Row level security

Tables created by Prisma do not get the row level security that Supabase applies to
tables made through its dashboard. On 2026-08-29 all six tables were confirmed readable
over the public REST API using the anon key — the key that ships to every browser — and
RLS was enabled on all of them (`prisma/rls.sql`).

There are deliberately **no policies**, which denies anon and authenticated outright.
Prisma is unaffected because it connects as the table owner and owners bypass RLS. All
access therefore goes through the app, where `lib/auth.ts` checks the session.

`prisma db push` does not manage RLS, so **rerun `prisma/rls.sql` after any push that
recreates a table**, and add the statement there when adding a model. To re-verify:

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/Employee?select=id&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
# expect []  — anything else means the table is exposed
```

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

## Deployment

Target is Vercel, which builds from `origin/main`. Two settings matter and both are
already committed:

- `npm run build` runs `prisma generate` first. Vercel restores a cached `node_modules`,
  so install alone will not regenerate the client and the build would ship a stale one.
- `DATABASE_URL` points at the **transaction pooler** (port 6543, `?pgbouncer=true`).
  Serverless functions each open their own connections and would exhaust a direct
  connection. `DIRECT_URL` (port 5432) exists for `db:push`, which cannot run through
  pgbouncer.

Set all five variables from `.env.example` in the Vercel project — Production and Preview.
`SUPABASE_SERVICE_ROLE_KEY` is only read by the provisioning scripts, which run from a
laptop, so the deployment does not strictly need it; leave it out of Vercel unless
something server-side starts using it.

After the first deploy, add the Vercel URL to Supabase under Authentication → URL
Configuration → Redirect URLs, or auth redirects will bounce to localhost.

---

## Regions and page latency

Users are in Manila. Production should use the Supabase project in Singapore
(`ap-southeast-1`) and Vercel functions in `sin1`. That pairing is what `vercel.json`
pins. Local `.env` already points at Singapore; Vercel has its **own** copy of the
same variable names, and those were still the Frankfurt project until the cutover.

The browser makes **one** round trip to the function, but the function makes **four
sequential** round trips to the database — middleware `getUser()`, the layout's second
`getUser()`, the layout's `Profile` lookup, then the page's queries. Function-to-database
distance therefore dominates, and colocating the function with the database beats
colocating it with the user:

| Function region + database | Manila → function | Function → DB (×4) | Total |
|---|---|---|---|
| `iad1` Washington + Frankfurt (Vercel default, old) | ~200ms | ~360ms | ~560ms |
| `sin1` Singapore + Frankfurt (worst pairing) | ~35ms | ~640ms | ~675ms |
| `fra1` Frankfurt + Frankfurt | ~195ms | ~4ms | ~200ms |
| `sin1` + Singapore (current target) | ~35ms | ~4ms | **~40ms** |

The Singapore project already exists and is seeded. Auth users cannot be copied
between Supabase projects; they were recreated there with the same emails and
passwords. Do not point functions at Singapore while `DATABASE_URL` still says
Frankfurt — that is the slow pairing above.

Page load is *not* limited by data volume: the routes page fetches 75 rows and the
employees page 15. Pagination would add complexity and save nothing, because the round
trips are the cost, not the rows.

---

## Next steps (priority order)

1. **Finish the Singapore cutover** — Vercel env vars must match local `.env`
   (Singapore). Then push so `vercel.json` moves functions to `sin1`.
2. **Delete the Frankfurt Supabase project** once live login and a test shipment
   succeed against Singapore.
3. **Add tests for `lib/calculations.ts`** — pure input/output payout math, no DB needed.
   Nothing currently checks the money except manual review.
4. **Move payout rate lookups to the DB** — removes the two-sources-of-truth risk above.
   Do this after tests.
5. **`isDestinationClient()` from the DB** — currently blocks saving any client that exists
   only in Supabase.
6. **Update `README.md`** — still says all data lives in `mockData.ts`.
7. **`payoutStatus`** — add DB column or remove from UI/export if not needed.
8. **Employee profile fields** — schema has no `employeeNo`, address, or emergency contact
   columns, and `tenureStatus` is derived from `isActive` alone, so every active employee
   renders as `"new"`.

---

## Risks

- **Rate drift:** `/admin/routes` and payout math read different sources — see above.
- **RLS resets on schema recreation** — `prisma db push` can drop and recreate a table
  without its RLS setting. Rerun `prisma/rls.sql` after any push.
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

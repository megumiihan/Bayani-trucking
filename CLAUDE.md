# Bayani Trucking: setup and working rules

Next.js 15 (App Router) + TypeScript + Tailwind v4, Prisma on Supabase Postgres,
Supabase Auth, deployed on Vercel. This file is for anyone (person or agent) setting
up a new copy of the repo. Deeper background lives in `HANDOFF.md`.

## Read this first: there is only one database

Every copy of this app, local and production, talks to **the same live Supabase
database**. There is no separate dev database. Anything you write locally is written
to the real data the business uses.

- **Never run `npm run db:seed`** (or `prisma db seed`, or `prisma migrate reset`).
  The seed deletes every shipment, employee, client and route before re-creating
  sample data.
- **Never pass `--accept-data-loss` or `--force-reset`** to any Prisma command.
- Before `npm run db:push`, check what it would change (see "Changing the schema").
  Only push when the diff contains nothing but `CREATE TABLE`, `ADD COLUMN` or
  `CREATE INDEX`. If it shows `DROP` or a column type change, stop and ask.
- Scripts in `scripts/` that take `--commit` do a dry run without it. Always run
  the dry run first and show the output before adding `--commit`.
- Don't create, delete or reset user logins unless asked to. Those are real people's
  accounts.

## 1. Get access

1. The repo owner adds your GitHub account as a collaborator on
   `github.com/megumiihan/Bayani-trucking` (repo Settings → Collaborators). Accept
   the email invite.
2. Get the `.env` values from the repo owner through a password manager or another
   private channel. **Don't** commit them, paste them into an issue or PR, or put
   them anywhere outside your local `.env`.

## 2. Install

Requires Node 20+ and git.

```bash
git clone https://github.com/megumiihan/Bayani-trucking.git
cd Bayani-trucking
npm install
npx prisma generate    # builds the typed database client
cp .env.example .env   # then paste in the values you were given
```

`.env.example` explains every variable. `GMAIL_*` can stay blank: email sending
just stays switched off.

Check that the shell isn't overriding `.env` (Prisma silently prefers shell
variables, and that has pointed commands at the wrong database before):

```bash
env | grep -E '^(DATABASE_URL|DIRECT_URL)='   # expect no output
```

**Don't run `db:push`, `db:seed` or `db:rls` as part of setup.** The database is
already set up.

## 3. Run it

```bash
npm run dev            # http://localhost:3000
```

You'll be redirected to `/login`. There's no sign-up page; the repo owner gives you
an admin login, or creates one with `scripts/provision-user.ts`.

Before handing work back, check that these pass:

```bash
npx tsc --noEmit
npm run lint
```

## 4. Git workflow

`main` deploys straight to production on Vercel. **Never commit or push directly to
`main`.**

```bash
git checkout main && git pull           # start from the latest
git checkout -b short-description       # one branch per change
# ...work, commit...
git push -u origin short-description
gh pr create                            # or open the PR on github.com
```

The repo owner reviews and merges. Pull `main` again before starting the next task.
Never commit `.env`, `.env.*` (except `.env.example`), or `*.local.json`; they hold
secrets and are gitignored, so don't force-add them.

## Changing the schema

Because the database is shared and live, a schema change affects production the
moment it's pushed. Agree on it with the repo owner first.

```bash
# 1. See what the live database is missing (read-only, safe):
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script
# "This is an empty migration." means already in sync.

# 2. Only if the diff is purely additive:
npm run db:push

# 3. If you added a new model, add it to prisma/rls.sql, then:
npm run db:rls
```

Then bump `CLIENT_REV` in `lib/prisma.ts` and add the new model to the `"x" in
cached` checks there. The dev server keeps a cached Prisma client across hot
reloads, and without the bump you get `Cannot read properties of undefined
(reading 'findMany')`. Restart `npm run dev` after any schema change.

Error `The column X does not exist in the current database` means the schema in
the code is ahead of the database: run step 1 and talk to the repo owner.

## How the code is laid out

- `app/`: routes. Server pages fetch data and pass `initial*` props down.
- `lib/queries/*`: reads (Prisma). `lib/actions/*`: writes (server actions; each
  calls `requireAdmin()` / `requireUser()` from `lib/auth.ts`).
- `lib/mappers/*`: Prisma rows → UI types.
- `components/views/*`: page-level client components; `components/admin/*`:
  modals and panels; `components/ui/*`: shared bits.
- Roles: admin, secretary, employee. Admin-only pages call
  `requirePageRole(["admin"])`.

Known gotcha: payout math reads static rates from `lib/rates.ts`, while
`/admin/routes` shows database rates. Details are in `HANDOFF.md`.

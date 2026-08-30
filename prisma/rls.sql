-- Lock the tables against Supabase's public REST API.
--
-- Prisma created these tables, so they never got the row level security that
-- Supabase applies to tables made through its dashboard. Without it, PostgREST
-- serves every row to anyone holding the anon key -- and that key is public by
-- design, shipped to every browser that loads the app.
--
-- Enabling RLS with no policies denies all access to the anon and authenticated
-- roles. The app is unaffected: Prisma connects as the table owner, and owners
-- bypass RLS unless FORCE is set. So all reads and writes continue to flow
-- through the app, where lib/auth.ts checks the session, and nothing can reach
-- the data around it.
--
-- Add policies here only if the browser ever needs to query Supabase directly.

ALTER TABLE "Employee"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Truck"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DestinationRoute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShipmentLog"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalaryPayment"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense"          ENABLE ROW LEVEL SECURITY;

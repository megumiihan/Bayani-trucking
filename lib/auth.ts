import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppUserRole = "admin" | "secretary" | "employee";

export type SessionUser = {
  id: string;
  email: string;
  role: AppUserRole;
  employeeId: string | null;
  employeeName: string | null;
  /** Linked employee drives (DRIVER or BOTH). Drivers can log fuel, repairs and checks. */
  isDriver: boolean;
};

/**
 * Current signed-in user, or null. Never throws — use in layouts and pages.
 *
 * Wrapped in React `cache()` so the root layout and the page share one lookup per request.
 * Uses `getClaims()`, which verifies the JWT signature locally (asymmetric signing keys)
 * instead of a round trip to Supabase on every call; middleware still runs `getUser()`
 * to refresh the session.
 */
/** Supabase user id from the session cookie, or null. Doesn't check the profile. */
export const getAuthUserId = cache(async (): Promise<string | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return error || !userId ? null : userId;
});

/**
 * A non-admin login linked to an employee marked inactive is switched off: it can't sign
 * in, and an existing session stops working on its next request.
 */
export function isLoginDisabled(profile: {
  role: string;
  employee: { isActive: boolean } | null;
}) {
  return profile.role !== "ADMIN" && profile.employee != null && !profile.employee.isActive;
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await getAuthUserId();
  if (!userId) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    include: { employee: { select: { id: true, fullName: true, role: true, isActive: true } } },
  });

  if (!profile || isLoginDisabled(profile)) return null;

  return {
    id: profile.id,
    email: profile.email,
    role:
      profile.role === "ADMIN"
        ? "admin"
        : profile.role === "SECRETARY"
          ? "secretary"
          : "employee",
    employeeId: profile.employee?.id ?? null,
    employeeName: profile.employee?.fullName ?? null,
    isDriver:
      Boolean(profile.employee?.isActive) &&
      (profile.employee?.role === "DRIVER" || profile.employee?.role === "BOTH"),
  };
});

/** Current user, or throws. Use as the first statement of a server action. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not signed in.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Admins only.");
  return user;
}

/** Admin or secretary: the office roles that log and edit shipments and payouts. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "secretary") throw new Error("Office staff only.");
  return user;
}

/**
 * For server pages: sends anyone whose role isn't allowed back to their home page,
 * so the page's data never reaches them.
 */
export async function requirePageRole(allowed: AppUserRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!allowed.includes(user.role)) {
    redirect(user.role === "employee" ? "/employee/shipments/new" : "/");
  }
  return user;
}

/** Staff or an active driver: may see the maintenance board and log fuel, repairs and checks. */
export function canLogTruckRecords(user: SessionUser) {
  return user.role === "admin" || user.role === "secretary" || user.isDriver;
}

/** Server-action guard for logging truck fuel, repairs and checks. */
export async function requireTruckLogger(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canLogTruckRecords(user)) throw new Error("Only office staff and drivers can log truck records.");
  return user;
}

/** Page guard for the truck pages: staff and drivers; everyone else goes home. */
export async function requireTruckPageAccess(): Promise<SessionUser> {
  const user = await requirePageRole(["admin", "secretary", "employee"]);
  if (!canLogTruckRecords(user)) redirect("/employee/shipments/new");
  return user;
}

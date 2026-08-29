import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string;
  role: "admin" | "employee";
  employeeId: string | null;
  employeeName: string | null;
};

/** Current signed-in user, or null. Never throws — use in layouts and pages. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    include: { employee: { select: { id: true, fullName: true } } },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role === "ADMIN" ? "admin" : "employee",
    employeeId: profile.employee?.id ?? null,
    employeeName: profile.employee?.fullName ?? null,
  };
}

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

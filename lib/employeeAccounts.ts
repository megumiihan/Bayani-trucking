import { createClient } from "@supabase/supabase-js";
import type { PrismaClient } from "@prisma/client";
import { randomInt } from "node:crypto";
import { encryptPassword } from "./credentialCrypto";

/**
 * Login creation for employees, shared by the admin dashboard and
 * scripts/provision-employees.ts. Server-only: uses the Supabase service role key.
 * Imports stay relative so the script can load this file with tsx.
 */

export const EMAIL_DOMAIN = "bayanitrucking.local";

const ANIMALS = [
  "Tamaraw", "Carabao", "Tarsier", "Eagle", "Heron", "Falcon", "Dolphin",
  "Marlin", "Gecko", "Python", "Mynah", "Parrot", "Turtle", "Panther",
  "Bison", "Otter", "Badger", "Cobra", "Osprey", "Kingfisher", "Stallion",
  "Barracuda", "Manta", "Pelican", "Jaguar", "Lynx", "Ibis", "Condor",
];

export function makePassword() {
  const animal = ANIMALS[randomInt(ANIMALS.length)];
  return `${animal}-${randomInt(1000, 10000)}`;
}

export function makeEmail(fullName: string, taken: Set<string>) {
  const firstName =
    fullName.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ||
    "driver";

  const preferred = `${firstName}@${EMAIL_DOMAIN}`;
  if (!taken.has(preferred)) {
    taken.add(preferred);
    return preferred;
  }

  // Same first name as an existing account — disambiguate with a number.
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const email = `${firstName}${suffix}@${EMAIL_DOMAIN}`;
    if (!taken.has(email)) {
      taken.add(email);
      return email;
    }
  }
  throw new Error(`Could not generate a unique email for ${fullName}`);
}

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Login creation isn't configured on this server (SUPABASE_SERVICE_ROLE_KEY missing)."
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Creates a Supabase auth user plus its Profile row for one employee, and stores
 * the password encrypted. If the Profile write fails, the auth user is deleted
 * again so no half-made account is left behind.
 *
 * Pass `email` to skip generation (the script precomputes emails for its dry run).
 */
export async function provisionLogin(
  prisma: PrismaClient,
  employee: { id: string; fullName: string },
  options: { email?: string; password?: string } = {}
): Promise<LoginCredentials> {
  // Fail before touching Supabase if passwords can't be stored.
  const password = options.password ?? makePassword();
  const encryptedPassword = encryptPassword(password);

  let email = options.email;
  if (!email) {
    const existing = await prisma.profile.findMany({ select: { email: true } });
    email = makeEmail(employee.fullName, new Set(existing.map((p) => p.email)));
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Could not create the login: ${error?.message ?? "unknown error"}`);
  }

  try {
    await prisma.profile.create({
      data: {
        id: data.user.id,
        email,
        role: "EMPLOYEE",
        employeeId: employee.id,
        encryptedPassword,
      },
    });
  } catch (profileError) {
    await admin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    throw profileError;
  }

  return { email, password };
}

/** Sets a new password in Supabase, then stores it. Returns the new password. */
export async function resetLoginPassword(
  prisma: PrismaClient,
  profileId: string
): Promise<string> {
  const password = makePassword();
  const encryptedPassword = encryptPassword(password);

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.updateUserById(profileId, { password });
  if (error) throw new Error(`Could not reset the password: ${error.message}`);

  await prisma.profile.update({
    where: { id: profileId },
    data: { encryptedPassword },
  });

  return password;
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type SignInResult = { success: false; error: string } | { success: true };

export async function signIn(
  email: string,
  password: string
): Promise<SignInResult> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const missing = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "DATABASE_URL",
    "DIRECT_URL",
  ].filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    return {
      success: false,
      error: `Server is missing ${missing.join(", ")}. Add them in Vercel and redeploy.`,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error || !data.user) {
      return { success: false, error: "Incorrect email or password." };
    }

    const profile = await prisma.profile.findUnique({
      where: { id: data.user.id },
      select: { id: true },
    });

    if (!profile) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: "This account has no profile yet. Ask an admin to set it up.",
      };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (cause) {
    const raw = cause instanceof Error ? cause.message : "Unknown error";
    const message = raw.replace(/postgresql:\/\/[^\s]+/gi, "[connection]");
    return {
      success: false,
      error: `Could not reach the database. Check DATABASE_URL and DIRECT_URL on Vercel (${message}).`,
    };
  }
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

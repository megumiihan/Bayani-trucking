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
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Clears the session and sends the person to /login. The root layout redirects here when
 * a signed-in login has no access any more (e.g. its employee was marked inactive), since
 * middleware would otherwise bounce a still-signed-in user from /login straight back.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  if (request.nextUrl.searchParams.get("reason") === "inactive") {
    loginUrl.searchParams.set("reason", "inactive");
  }
  return NextResponse.redirect(loginUrl);
}

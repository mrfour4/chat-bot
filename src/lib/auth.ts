import { redirect } from "next/navigation";

import type { Profile } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
  profile: Profile;
}

/**
 * The signed-in user plus their application profile, or null for a guest.
 *
 * Uses getUser() rather than getSession(): getSession() reads the cookie
 * without verifying it, which is not a basis for authorization.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) return null;

    return { id: user.id, email: user.email ?? profile.email, profile };
  } catch {
    // Misconfigured or unreachable Supabase must not take the guest chat down.
    return null;
  }
}

/** Redirects guests to the login page. Returns the user otherwise. */
export async function requireUser(redirectTo = "/login"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(redirectTo);
  return user;
}

/**
 * The signed-in teacher, or null.
 *
 * The non-redirecting sibling of `requireTeacher`, for route handlers. A route
 * that redirected would answer a JSON fetch with a 307 to /login, which the
 * caller would follow and receive HTML with a 200 -- leaving it unable to tell
 * "forbidden" from "here is a login page".
 */
export async function getTeacher(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user?.profile.role === "teacher" ? user : null;
}

/** Redirects anyone who is not a teacher. The RLS policies are the real guard. */
export async function requireTeacher(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.profile.role !== "teacher") redirect("/?error=forbidden");
  return user;
}

import { cookies } from "next/headers";
import { UserAccount } from "@/types";
import { dbStore } from "@/lib/db/store";

export const SESSION_COOKIE_NAME = "clubhub_session_uid";

/**
 * Retrieves the currently logged-in user from the session cookie,
 * or returns null if unauthenticated.
 */
export async function getCurrentUser(): Promise<UserAccount | null> {
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!uid) return null;

    const user = dbStore.getUserById(uid);
    return user || null;
  } catch (err) {
    return null;
  }
}

import { auth } from "@/auth";
import { UserAccount } from "@/types";
import { dbStore } from "@/lib/db/store";

/**
 * Retrieves the currently logged-in user from the genuine NextAuth session,
 * verifying provider identity on the server side.
 * Returns null if unauthenticated.
 */
export async function getCurrentUser(): Promise<UserAccount | null> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return null;
    }

    const user = session.user.id
      ? dbStore.getUserById(session.user.id) || dbStore.getUserByEmail(session.user.email)
      : dbStore.getUserByEmail(session.user.email);

    return user || null;
  } catch (err) {
    console.error("Error retrieving session user:", err);
    return null;
  }
}

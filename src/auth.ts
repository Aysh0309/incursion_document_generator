import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { dbStore } from "@/lib/db/store";
import { UserRole } from "@/types";

const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || account.provider !== "google") {
        return false;
      }

      if (!profile?.email) {
        console.error("[Google OAuth] Authentication failed: email is missing from Google profile.");
        return false;
      }

      // Mandatory requirement: require email_verified === true
      const emailVerified =
        (profile as any).email_verified === true ||
        (profile as any).email_verified === "true";

      if (!emailVerified) {
        console.error(
          `[Google OAuth] Authentication failed: email ${profile.email} is not verified by Google.`
        );
        return false;
      }

      return true;
    },

    async jwt({ token, account, profile }) {
      if (account && profile && profile.email) {
        const googleId = account.providerAccountId;
        token.googleId = googleId;

        // Upsert user into database using verified Google account details
        const dbUser = dbStore.upsertUser({
          email: profile.email.toLowerCase().trim(),
          name: profile.name || profile.email.split("@")[0],
          image: (profile as any).picture || profile.image,
          googleId,
        });

        token.userId = dbUser.id;
        token.role = dbUser.role;
      } else if (token.userId) {
        // Keep role updated with live dbStore in case an admin updated it
        const dbUser = dbStore.getUserById(token.userId as string);
        if (dbUser) {
          token.role = dbUser.role;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) || (token.sub as string);
        (session.user as any).role = (token.role as UserRole) || "MEMBER";
        (session.user as any).googleId = token.googleId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});

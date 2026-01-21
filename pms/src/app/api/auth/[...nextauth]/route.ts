import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password");
        }

        try {
          // Find user in database
          const user = await prisma.users.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.password) {
            throw new Error("Invalid email or password");
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("Invalid email or password");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role, // Will be null for new users
          };
        } catch (error) {
          throw new Error("Invalid email or password");
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle OAuth providers (Google, GitHub, etc.)
      if (account?.provider && account.provider !== "credentials") {
        const email = user.email || profile?.email;

        if (!email) return false;

        try {
          // Check if user exists
          const existingUser = await prisma.users.findUnique({ 
            where: { email },
            select: { id: true, role: true }
          });

          if (existingUser) {
            // Link OAuth account to existing user
            await prisma.accounts.upsert({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
              update: {
                access_token: account.access_token,
                expires_at: account.expires_at,
                refresh_token: account.refresh_token,
              },
              create: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            });

            // Update user object for JWT
            user.id = existingUser.id;
            (user as any).role = existingUser.role;
          } else {
            // Create new user for OAuth signup - needs role selection
            const newUser = await prisma.users.create({
              data: {
                email,
                name: user.name || (profile as any)?.name || null,
                image: user.image || (profile as any)?.picture || (profile as any)?.avatar_url || null,
                emailVerified: new Date(), // OAuth accounts are pre-verified
                // role is intentionally not set - user will select it
              },
            });

            // Create account link
            await prisma.accounts.create({
              data: {
                userId: newUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            });

            user.id = newUser.id;
            (user as any).role = newUser.role; // Will be null, triggering role selection
          }
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      // Initial sign in - store role in token
      if (user) {
        token.role = (user as any).role;
        token.needsRoleSelection = !(user as any).role; // If no role, needs selection
        token.id = user.id;
      }
      
      // Handle session update (e.g., role change)
      if (trigger === "update" && session?.role) {
        token.needsRoleSelection = false; // Clear flag after role selection
        token.role = session.role;
        return token;
      }
      
      // Always validate user still exists in database
      if (token.email) {
        const dbUser = await prisma.users.findUnique({
          where: { email: token.email as string },
          select: { role: true, id: true },
        });
        
        // If user was deleted from DB, invalidate token
        if (!dbUser) {
          return null as any; // This will sign out the user
        }
        
        // Update token with fresh data
        token.role = dbUser.role;
        token.id = dbUser.id;
      }
      
      if (account?.provider) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).needsRoleSelection = token.needsRoleSelection;
        (session.user as any).provider = token.provider;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

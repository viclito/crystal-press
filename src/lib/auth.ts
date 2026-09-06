import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "c9f8a3d7e5b24168a0c4f39e872d61b5c904e287a1d3f65e49b8027a6f1c8e3d",
  pages: {
    signIn: "/login",
  },
  providers: [
    // 1. Google OAuth Provider (For Owner & Store Management)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // 2. Staff Credentials Provider (For Rapid POS Counter Shifts)
    CredentialsProvider({
      name: "Staff Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin / cashier" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Please enter both username and password");
        }

        const username = credentials.username.trim().toLowerCase();

        // Find user by username
        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user || !user.isActive) {
          throw new Error("Invalid username or user is inactive");
        }

        // Check password (supports demo passwords or bcrypt)
        const isPasswordMatch =
          credentials.password === user.passwordHash ||
          (await bcrypt.compare(credentials.password, user.passwordHash).catch(() => false));

        if (!isPasswordMatch) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          name: user.fullName,
          email: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        // Find or create Owner/Admin user for Google account
        let existingUser = await prisma.user.findFirst({
          where: { username: email },
        });

        if (!existingUser) {
          // If first Google user, make them ADMIN / Owner
          existingUser = await prisma.user.create({
            data: {
              username: email,
              fullName: user.name || "Google User",
              passwordHash: "OAUTH_USER",
              role: UserRole.ADMIN,
              isActive: true,
            },
          });
        }

        user.id = existingUser.id;
        (user as any).role = existingUser.role;
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || UserRole.CASHIER;
        token.fullName = user.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).fullName = token.fullName;
      }
      return session;
    },
  },
};

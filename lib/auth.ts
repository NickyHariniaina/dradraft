import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import PostgresAdapter from "@auth/pg-adapter"
import { Pool } from "pg"

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  secret: process.env.AUTH_SECRET,
  providers: [
    GitHub({
      authorization: { params: { scope: "read:user user:email repo" } },
    }),
  ],
  callbacks: {
    jwt({ token, account }) {
      if (account?.access_token) (token as any).accessToken = account.access_token
      return token
    },
    session({ session, token }) {
      ;(session as any).accessToken = (token as any).accessToken
      return session
    },
  },
})

import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  callbacks: {
    async session({ session, token }) {
      session.user.id = token.sub
      session.user.username = token.username || session.user.email?.split('@')[0]
      session.user.joinedDate = token.joinedDate
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id
        token.username = user.email?.split('@')[0]
        token.joinedDate = new Date().toISOString()
      }
      return token
    },
    async signIn({ user, account, profile }) {
      return true
    }
  },
  pages: {
    signIn: '/login',
  }
})

export { handler as GET, handler as POST }

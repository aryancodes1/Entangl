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
      session.user.phoneVerified = token.phoneVerified
      session.user.verifiedPhone = token.verifiedPhone
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id
        token.username = user.email?.split('@')[0]
        token.joinedDate = new Date().toISOString()
        
        // Check if phone was verified (from localStorage - will be passed during sign in)
        if (typeof window !== 'undefined') {
          token.phoneVerified = localStorage.getItem('phoneVerified') === 'true'
          token.verifiedPhone = localStorage.getItem('verifiedPhone')
        }
      }
      return token
    },
    async signIn({ user, account, profile }) {
      // In production, you might want to check phone verification status from database
      return true
    }
  },
  pages: {
    signIn: '/login',
  }
})

export { handler as GET, handler as POST }

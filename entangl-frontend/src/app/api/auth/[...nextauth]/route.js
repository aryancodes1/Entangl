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
      session.user.dbToken = token.dbToken // Add database token
      return session
    },
    async jwt({ token, user, account }) {
      if (user && account?.provider === 'google') {
        // Store Google user in our database
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_NODE_BACKEND_URL}/api/auth/google-signin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              image: user.image,
              googleId: user.id
            }),
          });

          if (response.ok) {
            const data = await response.json();
            token.dbToken = data.token; // Store our database token
            token.dbUser = data.user;
            token.sub = data.user.id; // Use our database user ID
            token.username = data.user.username;
            console.log('Google user stored in database:', data.user.username);
          } else {
            console.error('Failed to store Google user in database');
          }
        } catch (error) {
          console.error('Error storing Google user:', error);
        }
        
        token.joinedDate = new Date().toISOString();
      }
      return token
    },
    async signIn({ user, account, profile }) {
      return true
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development'
})

export { handler as GET, handler as POST }

import NextAuth from 'next-auth/next';
import CredentialsProvider from 'next-auth/providers/credentials';
import { CONFIG } from '@pezi-bot/bot';

export default NextAuth({
  secret: CONFIG.webAppSecret,
  providers: [
    CredentialsProvider({
      name: 'Login',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'Twitch Username' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, _) {
        console.log(CONFIG.webAppUrl);
        const res = await fetch(`${CONFIG.webAppUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });

        if (!res.ok) throw Error(await res.text());

        const user = await res.json();
        return user;
      },
    }),
  ],
});

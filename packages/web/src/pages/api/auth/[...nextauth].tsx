import { CONFIG } from '@server/app';
import NextAuth from 'next-auth/next';
import TwitchProvider from 'next-auth/providers/twitch';

export default NextAuth({
  providers: [
    TwitchProvider({
      clientId: CONFIG.clientId,
      clientSecret: CONFIG.password,
    }),
  ],
});

import { DbConnection, TwitchClient } from '@pezi-bot/bot';

declare global {
  namespace Express {
    export interface Request {
      db: DbConnection;
      bot: TwitchClient;
    }
  }
}

declare module 'next' {
  export interface NextApiRequest {
    db: DbConnection;
    bot: TwitchClient;
  }
}

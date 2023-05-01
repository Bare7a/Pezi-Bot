import { App } from '@pezi-bot/bot';

declare global {
  namespace Express {
    export interface Request {
      db: typeof App.db;
      bot: typeof App.bot;
    }
  }
}

declare module 'next' {
  export interface NextApiRequest {
    db: typeof App.db;
    bot: typeof App.bot;
  }
}

import next from 'next';
import express from 'express';
import { App } from './server/app';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const server = express();
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  await App.start();

  server.get('*', (req, res) => {
    req.db = App.db;
    req.bot = App.bot;
    handle(req, res);
  });

  server.listen(port, () =>
    console.log(`> Server listening at http://localhost:${port} as ${dev ? 'development' : process.env.NODE_ENV}`)
  );
});

import url from 'url';
import next from 'next';
import express from 'express';
import { App, CONFIG } from './server/app';
import { getSession } from 'next-auth/react';

const port = CONFIG.webAppPort;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const server = express();
const router = express.Router();

router.get('/next-auth', async (req, res) => {
  const session = await getSession({ req });

  if (session) res.status(200).json({ ok: true, session });
  else res.status(401).json({ ok: false, message: 'Unauthenticated' });
});

module.exports = router;

app.prepare().then(async () => {
  await App.start();

  server.use('/backend', router);
  server.use(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    req.db = App.db;
    req.bot = App.bot;
    await handle(req, res, parsedUrl);
  });

  server.listen(port, () =>
    console.log(`> Server listening at ${CONFIG.webAppUrl} as ${dev ? 'development' : process.env.NODE_ENV}`)
  );
});

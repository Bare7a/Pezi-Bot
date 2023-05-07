import express from 'express';

import { App } from './utils/App';
import { CONFIG } from './utils/Config';

const startExpressApp = async (isEnabled: boolean) => {
  if (!isEnabled) return false;

  const { db } = App;
  const app = express();
  const port = Number(CONFIG.webAppPort || '3000');

  app.get('/', (req, res) => {
    return res.send('Hello World!');
  });

  app.get('/users', async (_, res) =>
    res.json(await db.User.findAll({ attributes: { exclude: ['commands', 'createdAt', 'updatedAt'] }, raw: true }))
  );

  app.get('/crons', async (_, res) =>
    res.json(await db.Cron.findAll({ attributes: { exclude: ['opts', 'createdAt', 'updatedAt'] } }))
  );

  app.get('/commands', async (_, res) =>
    res.json(
      await db.Command.findAll({
        attributes: { exclude: ['opts', 'cdMessage', 'lastCalledAt', 'createdAt', 'updatedAt'] },
      })
    )
  );

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });

  return true;
};

(async () => {
  await App.start();
  await startExpressApp(CONFIG.webAppEnabled);
})();

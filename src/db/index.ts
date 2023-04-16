import path from 'path';
import { Sequelize } from 'sequelize-typescript';

import { Log } from './Log.js';
import { User } from './User.js';
import { Cron } from './Cron.js';
import { Command } from './Command.js';

const syncDb = async () => {
  const dbPath = path.join(__dirname, '..', '..', 'db.sqlite');
  const logPath = path.join(__dirname, '..', '..', 'log.sqlite');

  const sequelizeDb = new Sequelize({
    logging: false,
    dialect: 'sqlite',
    storage: dbPath,
    models: [User, Cron, Command],
  });
  await sequelizeDb.sync();

  const sequelizeLog = new Sequelize({
    logging: false,
    dialect: 'sqlite',
    storage: logPath,
    models: [Log],
  });

  await sequelizeLog.sync();

  const [cronsCount, commandsCount] = await Promise.all([Cron.count(), Command.count()]);

  const promises = [];
  if (cronsCount === 0) promises.push(Cron.seed());
  if (commandsCount === 0) promises.push(Command.seed());
  await Promise.all(promises);
};

export { User, Cron, Command, Log, syncDb };

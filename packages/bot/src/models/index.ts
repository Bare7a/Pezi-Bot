import Sequelize from '@sequelize/core';

import { User } from './User';
import { Cron } from './Cron';
import { Command } from './Command';
import { Log } from './Log';
import { CONFIG } from '../utils';

export * from './Command';
export * from './Cron';
export * from './Log';
export * from './User';

export const syncDb = async () => {
  const sequelizeDb = new Sequelize({
    logging: false,
    dialect: 'sqlite',
    storage: CONFIG.dbPath,
  });
  User.init(User.defaultAttributes, { sequelize: sequelizeDb });
  Cron.init(Cron.defaultAttributes, { sequelize: sequelizeDb });
  Command.init(Command.defaultAttributes, { sequelize: sequelizeDb });
  await sequelizeDb.sync();

  const sequelizeLog = new Sequelize({
    logging: false,
    dialect: 'sqlite',
    storage: CONFIG.logPath,
  });
  Log.init(Log.defaultAttributes, { sequelize: sequelizeLog });
  await sequelizeLog.sync();

  const [cronsCount, commandsCount] = await Promise.all([Cron.count(), Command.count()]);

  const promises = [];
  if (cronsCount === 0) promises.push(Cron.seed());
  if (commandsCount === 0) promises.push(Command.seed());
  await Promise.all(promises);
};

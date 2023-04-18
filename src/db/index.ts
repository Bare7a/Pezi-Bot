import path from 'path';
import { Sequelize, DataTypes } from '@sequelize/core';

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
  });

  User.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.TEXT, allowNull: false },
      username: { type: DataTypes.TEXT, allowNull: false },
      points: { type: DataTypes.INTEGER, allowNull: false },
      color: { type: DataTypes.TEXT, allowNull: true },
      isSub: { type: DataTypes.BOOLEAN, allowNull: false },
      isVIP: { type: DataTypes.BOOLEAN, allowNull: false },
      isMod: { type: DataTypes.BOOLEAN, allowNull: false },
      isAdmin: { type: DataTypes.BOOLEAN, allowNull: false },
      isStreamer: { type: DataTypes.BOOLEAN, allowNull: false },
      commands: { type: DataTypes.JSON, allowNull: false },
    },
    { sequelize: sequelizeDb }
  );

  Cron.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      type: { type: DataTypes.TEXT, allowNull: false },
      interval: { type: DataTypes.INTEGER, allowNull: false },
      isEnabled: { type: DataTypes.BOOLEAN, allowNull: false },
      isExecuting: { type: DataTypes.BOOLEAN, allowNull: false },
      isLogEnabled: { type: DataTypes.BOOLEAN, allowNull: false },
      lastCalledAt: { type: DataTypes.DATE, allowNull: false },
      callAt: { type: DataTypes.DATE, allowNull: false },
      opts: { type: DataTypes.JSON, allowNull: false },
    },
    { sequelize: sequelizeDb }
  );

  Command.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      type: { type: DataTypes.TEXT, allowNull: false },
      isEnabled: { type: DataTypes.BOOLEAN, allowNull: false },
      isLogEnabled: { type: DataTypes.BOOLEAN, allowNull: false },
      lastCalledAt: { type: DataTypes.DATE, allowNull: false },
      opts: { type: DataTypes.JSON, allowNull: false },
      cost: { type: DataTypes.INTEGER, allowNull: false },
      customCost: { type: DataTypes.BOOLEAN, allowNull: false },
      userCd: { type: DataTypes.INTEGER, allowNull: false },
      globalCd: { type: DataTypes.INTEGER, allowNull: false },
      cdMessage: { type: DataTypes.TEXT, allowNull: false },
      showCdMessage: { type: DataTypes.BOOLEAN, allowNull: false },
      onlyOnline: { type: DataTypes.BOOLEAN, allowNull: false },
      permission: { type: DataTypes.JSON, allowNull: false },
    },
    { sequelize: sequelizeDb }
  );

  await sequelizeDb.sync();

  const sequelizeLog = new Sequelize({
    logging: false,
    dialect: 'sqlite',
    storage: logPath,
  });

  Log.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      type: { type: DataTypes.TEXT, allowNull: false },
      userId: { type: DataTypes.TEXT, allowNull: false },
      points: { type: DataTypes.INTEGER, allowNull: false },
      cost: { type: DataTypes.INTEGER, allowNull: false },
      allPoints: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize: sequelizeLog }
  );

  await sequelizeLog.sync();

  const [cronsCount, commandsCount] = await Promise.all([Cron.count(), Command.count()]);

  const promises = [];
  if (cronsCount === 0) promises.push(Cron.seed());
  if (commandsCount === 0) promises.push(Command.seed());
  await Promise.all(promises);
};

export { User, Cron, Command, Log, syncDb };

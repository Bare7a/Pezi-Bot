import NodeCron from 'node-cron';
import Sequelize from '@sequelize/core';
import { ChatUserstate } from 'tmi.js';

import { CONFIG, TwitchClient } from '.';
import { User, Command, Cron, Log } from '../models';
import { giveViewersRewards, updateStreamStatus, updateTriviaQuestion, updateRaffleBets } from '../crons';

type DbType = { User: typeof User; Cron: typeof Cron; Command: typeof Command; Log: typeof Log };

export class App {
  private static isStarted = false;

  static db?: DbType;
  static bot?: TwitchClient;

  static async start() {
    if (App.isStarted) return true;
    App.isStarted = true;

    const db = await App.loadDb();

    const bot = new TwitchClient({ identity: CONFIG, channels: [CONFIG.streamer] }, CONFIG);
    await bot.start();
    bot.on('message', async (_, userstate: ChatUserstate, message: string): Promise<boolean> => {
      try {
        const params = message.split(' ');
        const commandName = params.shift();

        if (!User.isValidUserState(userstate)) return false;

        const [user, command] = await Promise.all([
          User.fetch(userstate),
          Command.findOne({ where: { name: commandName } }),
        ]);
        await user.addAsChatter();

        if (!command) return false;

        const userCanExecute = await command.canUserExecute(user, bot);
        if (!userCanExecute) return false;

        const isExecutedSuccesfully = await command.execute(user, params, bot);
        if (isExecutedSuccesfully) await command.addCooldowns(user);

        return true;
      } catch (ex) {
        console.log(`There was an error while trying to execute "${message}"`);
        console.log(ex);

        return false;
      }
    });

    await Cron.resetExecution();
    const cronJobs = [updateStreamStatus, giveViewersRewards, updateTriviaQuestion, updateRaffleBets];
    NodeCron.schedule(`*/1 * * * * *`, async () => await Promise.all(cronJobs.map((cronJob) => cronJob(bot))));

    App.db = db;
    App.bot = bot;

    return true;
  }

  static async loadDb() {
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

    return { User, Cron, Command, Log };
  }
}

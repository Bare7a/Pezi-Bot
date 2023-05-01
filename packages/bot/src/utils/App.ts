import NodeCron from 'node-cron';
import Sequelize from '@sequelize/core';
import { ChatUserstate } from 'tmi.js';

import { CONFIG } from './Config';
import { TwitchClient } from './Bot';
import { Command } from '../models/Command';
import { Cron } from '../models/Cron';
import { User } from '../models/User';
import { Log } from '../models/Log';
import { RewardCron } from '../crons/Rewards';
import { AdminCommand } from '../commands/Admin';
import { CmdCommand } from '../commands/Cmd';
import { DiceCommand } from '../commands/Dice';
import { FlipCommand } from '../commands/Flip';
import { MessageCommand } from '../commands/Message';
import { NoteCommand } from '../commands/Note';
import { PointsCommand } from '../commands/Points';
import { RaffleCommand } from '../commands/Raffle';
import { SlotCommand } from '../commands/Slot';
import { StatsCommand } from '../commands/Stats';
import { TriviaCommand } from '../commands/Trivia';
import { RaffleCron } from '../crons/Raffle';
import { StatusCron } from '../crons/Status';
import { TriviaCron } from '../crons/Trivia';
import { ICommand } from '@pezi-bot/db';

export type DbConnection = { Command: typeof Command; Cron: typeof Cron; User: typeof User; Log: typeof Log };
export abstract class App {
  private static isStarted = false;

  static db: DbConnection = { Command, Cron, User, Log };
  static bot: TwitchClient = new TwitchClient({ identity: CONFIG, channels: [CONFIG.streamer] }, CONFIG);

  static async start() {
    if (App.isStarted) return true;
    App.isStarted = true;
    const { Command, Cron, User } = App.db;

    Promise.all([await App.loadDb(), App.loadBot()]);
    await App.syncDb();

    App.bot.on('message', async (_, userstate: ChatUserstate, message: string): Promise<boolean> => {
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

        const userCanExecute = await command.canUserExecute(user, App.bot);
        if (!userCanExecute) return false;

        const isExecutedSuccesfully = await App.execute(command, user, params, App.bot);
        if (isExecutedSuccesfully) await command.addCooldowns(user);

        return true;
      } catch (ex) {
        console.log(`There was an error while trying to execute "${message}"`);
        console.log(ex);

        return false;
      }
    });

    await Cron.resetExecution();
    const cronJobs = [StatusCron, RewardCron, TriviaCron, RaffleCron];
    NodeCron.schedule(
      `*/1 * * * * *`,
      async () => await Promise.all(cronJobs.map((cronJob) => cronJob.execute(App.bot)))
    );

    return true;
  }

  static async loadDb() {
    const { Command, Cron, User, Log } = App.db;

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

    return { Command, Cron, User, Log };
  }

  static async loadBot() {
    await App.bot.start();
    return App.bot;
  }

  static async syncDb() {
    const [cronsCount, commandsCount] = await Promise.all([Cron.count(), Command.count()]);

    const commands = [
      AdminCommand.defaultConfig,
      CmdCommand.defaultConfig,
      DiceCommand.defaultConfig,
      FlipCommand.defaultConfig,
      MessageCommand.defaultConfig,
      NoteCommand.defaultConfig,
      PointsCommand.defaultConfig,
      RaffleCommand.defaultConfig,
      SlotCommand.defaultConfig,
      StatsCommand.defaultConfig,
      TriviaCommand.defaultConfig,
    ];

    const crons = [
      RaffleCron.defaultConfig,
      RewardCron.defaultConfig,
      StatusCron.defaultConfig,
      TriviaCron.defaultConfig,
    ];

    const promises = [];
    if (cronsCount === 0) promises.push(Cron.bulkCreate(crons));
    if (commandsCount === 0) promises.push(Command.bulkCreate(commands));
    await Promise.all(promises);
  }

  static async execute(command: Command<ICommand>, user: User, params: string[], bot: TwitchClient): Promise<Boolean> {
    if (AdminCommand.isValid(command)) return await AdminCommand.execute(user, params, command, bot);
    if (CmdCommand.isValid(command)) return await CmdCommand.execute(user, params, command, bot);
    if (DiceCommand.isValid(command)) return await DiceCommand.execute(user, params, command, bot);
    if (FlipCommand.isValid(command)) return await FlipCommand.execute(user, params, command, bot);
    if (MessageCommand.isValid(command)) return await MessageCommand.execute(user, params, command, bot);
    if (NoteCommand.isValid(command)) return await NoteCommand.execute(user, params, command, bot);
    if (PointsCommand.isValid(command)) return await PointsCommand.execute(user, params, command, bot);
    if (RaffleCommand.isValid(command)) return await RaffleCommand.execute(user, params, command, bot);
    if (SlotCommand.isValid(command)) return await SlotCommand.execute(user, params, command, bot);
    if (StatsCommand.isValid(command)) return await StatsCommand.execute(user, params, command, bot);
    if (TriviaCommand.isValid(command)) return await TriviaCommand.execute(user, params, command, bot);
    return false;
  }
}

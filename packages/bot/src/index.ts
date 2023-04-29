export * from './commands';
export * from './crons';
export * from './models';
export * from './types';
export * from './utils';

import NodeCron from 'node-cron';
import { ChatUserstate } from 'tmi.js';

import { User, Command, Cron, syncDb } from './models';
import { CONFIG, TwitchClient } from './utils';
import { giveViewersRewards, updateStreamStatus, updateTriviaQuestion, updateRaffleBets } from './crons';

export const start = async () => {
  await syncDb();

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
};

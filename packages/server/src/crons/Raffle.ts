import { ICron, IRaffleCommand, RaffleCronType, StatusCronType, isStatusCron } from '@pezi-bot/shared';

import { TwitchClient } from '../utils/Bot';
import { Command } from '../models/Command';
import { Cron } from '../models/Cron';
import { User } from '../models/User';
import { CONFIG } from '../utils/Config';
import { CronActionType } from '../types/Cron';

export const RaffleCron: CronActionType<RaffleCronType> = {
  defaultConfig: {
    type: 'RAFFLE',
    interval: 0,
    isEnabled: true,
    isExecuting: false,
    isLogEnabled: true,
    lastCalledAt: new Date(0),
    callAt: new Date(0),
    opts: {
      pot: 0,
      userList: [],
      isBettingOpened: false,
    },
  },

  isValid: (cron: Cron<ICron>): cron is Cron<RaffleCronType> => isStatusCron(cron),

  execute: async function (bot: TwitchClient): Promise<boolean> {
    try {
      const [raffleCommand, raffleCron, statusCron] = await Promise.all([
        Command.fetch<IRaffleCommand>('RAFFLE'),
        Cron.fetch<RaffleCronType>('RAFFLE'),
        Cron.fetch<StatusCronType>('STATUS'),
      ]);

      const { pot, userList, isBettingOpened } = raffleCron.opts;
      const { isEnabled, onlyOnline } = raffleCommand;
      const { messages, showMessages, betCountdown, startCountdown, minBet, maxBet } = raffleCommand.opts;

      const isExecutionTime = raffleCron.isExecutePermited();
      const isCommandEnabled = isEnabled && (!onlyOnline || statusCron.opts.isOnline);

      if (!isExecutionTime || !isCommandEnabled) return false;

      raffleCron.isExecuting = true;
      await raffleCommand.save();

      // Closing the previous raffle
      if (!isBettingOpened) {
        const message = messages.started
          .replaceAll('$min', minBet.toString())
          .replaceAll('$max', maxBet.toString())
          .replaceAll('$currency', CONFIG.currencyName)
          .replaceAll('$command', raffleCommand.name);
        await bot.send(message);

        raffleCron.opts.isBettingOpened = true;
        raffleCron.callAt = raffleCron.getCallAtDate(betCountdown);
        raffleCron.lastCalledAt = new Date();
        raffleCron.isExecuting = false;

        raffleCron.changed('opts', true);
        await raffleCron.save();

        return true;
      }

      // Opening a new raffle
      const winnerNumber = Math.floor(Math.random() * pot) + 1;
      const user = userList.find(([_userId, ticket]) => ticket >= winnerNumber);
      const winner = user && (await User.findOne({ where: { id: user[0] } }));

      if (winner) {
        const points = raffleCron.opts.pot;
        await winner.addPoints(0, points, raffleCommand.type, raffleCommand.isLogEnabled);

        const message = messages.userWon
          .replaceAll('$win', pot.toString())
          .replaceAll('$user', winner.username)
          .replaceAll('$command', raffleCommand.name)
          .replaceAll('$currency', CONFIG.currencyName);
        await bot.send(message);
      }

      if (!user && showMessages.noBets) {
        const message = messages.noBets
          .replaceAll('$command', raffleCommand.name)
          .replaceAll('$currency', CONFIG.currencyName);
        await bot.send(message);
      }

      raffleCron.opts.pot = 0;
      raffleCron.opts.userList = [];
      raffleCron.opts.isBettingOpened = false;
      raffleCron.callAt = raffleCron.getCallAtDate(startCountdown);
      raffleCron.lastCalledAt = new Date();
      raffleCron.isExecuting = false;

      raffleCron.changed('opts', true);
      await raffleCron.save();

      return true;
    } catch (ex) {
      console.log(`There was an error while running updateRaffleBets`);
      console.log(ex);

      return false;
    }
  },
};

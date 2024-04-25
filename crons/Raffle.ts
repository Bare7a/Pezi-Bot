import { env } from '../utils/Config';
import { TwitchActions } from '../types/utils/Twitch';
import { IRaffleCommand } from '../types/models/Command';
import { CronActionType, isStatusCron, DbActions } from '../types/utils/DB';
import { RaffleCronType, Cron, ICron, StatusCronType } from '../types/models/Cron';

export const RaffleCron: CronActionType<RaffleCronType> = {
  isValid: (cron: Cron<ICron>): cron is Cron<RaffleCronType> => isStatusCron(cron),
  execute: async (db: DbActions, bot: TwitchActions): Promise<boolean> => {
    try {
      const raffleCommand = db.Command.fetch<IRaffleCommand>('RAFFLE');
      const raffleCron = db.Cron.fetch<RaffleCronType>('RAFFLE');
      const statusCron = db.Cron.fetch<StatusCronType>('STATUS');
      if (!raffleCommand) return false;

      const { pot, userList, isBettingOpened } = raffleCron.opts;
      const { isEnabled, onlyOnline } = raffleCommand;
      const { messages, showMessages, betCountdown, startCountdown, minBet, maxBet } = raffleCommand.opts;

      const isExecutionTime = db.Cron.isExecutePermited(raffleCron);
      const isCommandEnabled = isEnabled && (!onlyOnline || statusCron.opts.isOnline);

      if (!isExecutionTime || !isCommandEnabled) return false;

      raffleCron.isExecuting = true;
      db.Cron.update(raffleCron.type, raffleCron);

      // Closing the previous raffle
      if (!isBettingOpened) {
        const message = messages.started
          .replaceAll('$min', minBet.toString())
          .replaceAll('$max', maxBet.toString())
          .replaceAll('$currency', env.botCurrencyName)
          .replaceAll('$command', raffleCommand.name);
        bot.send(message);

        raffleCron.opts.isBettingOpened = true;
        raffleCron.callAt = db.Cron.getCallAtDate(raffleCron, betCountdown);
        raffleCron.lastCalledAt = new Date();
        raffleCron.isExecuting = false;
        db.Cron.update(raffleCron.type, raffleCron);

        return true;
      }

      // Opening a new raffle
      const winnerNumber = Math.floor(Math.random() * pot) + 1;
      const user = userList.find(([_userId, ticket]) => ticket >= winnerNumber);
      const winner = user && db.User.getById(user[0]);

      if (winner) {
        const points = raffleCron.opts.pot;
        const Log = raffleCommand.isLogEnabled ? db.Log : undefined;

        db.User.addPoints(winner, 0, points, raffleCommand.type, Log);

        const message = messages.userWon
          .replaceAll('$win', pot.toString())
          .replaceAll('$user', winner.username)
          .replaceAll('$command', raffleCommand.name)
          .replaceAll('$currency', env.botCurrencyName);
        bot.send(message);
      }

      if (!user && showMessages.noBets) {
        const message = messages.noBets
          .replaceAll('$command', raffleCommand.name)
          .replaceAll('$currency', env.botCurrencyName);
        bot.send(message);
      }

      raffleCron.opts.pot = 0;
      raffleCron.opts.userList = [];
      raffleCron.opts.isBettingOpened = false;
      raffleCron.callAt = db.Cron.getCallAtDate(raffleCron, startCountdown);
      raffleCron.lastCalledAt = new Date();
      raffleCron.isExecuting = false;

      db.Cron.update(raffleCron.type, raffleCron);

      return true;
    } catch (ex) {
      console.log(`There was an error while running updateRaffleBets`);
      console.log(ex);

      return false;
    }
  },
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
};

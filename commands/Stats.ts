import { env } from '../utils/Config';
import { IStatsCommand, Command } from '../types/models';
import { CommandActionType, isStatsCommand } from '../types/utils';

export const StatsCommand: CommandActionType<IStatsCommand> = {
  isValid: (command): command is Command<IStatsCommand> => isStatsCommand(command),
  execute: (user, _, command, db, bot): boolean => {
    const currencyName = env.botCurrencyName;

    const logs = db.Log.getUserBets(user.userId);
    const stake = logs.reduce((sum, log) => sum + log.cost, 0);
    const profit = logs.reduce((sum, log) => sum + log.points, 0);

    const isPositive = profit >= 0;

    let message = isPositive ? command.opts.messages.positive : command.opts.messages.negative;
    message = message
      .replaceAll('$user', user.username)
      .replaceAll('$stake', Math.abs(stake).toString())
      .replaceAll('$profit', profit.toString())
      .replaceAll('$currency', currencyName);

    bot.send(message);

    return true;
  },
  defaultConfig: {
    name: '!stats',
    type: 'STATS',
    cost: 0,
    customCost: false,
    userCd: 60,
    globalCd: 0,
    cdMessage: '$user You can use $command after $cd seconds!',
    showCdMessage: true,
    isEnabled: true,
    onlyOnline: false,
    permissions: ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'],
    lastCalledAt: new Date(0),
    isLogEnabled: false,
    opts: {
      messages: {
        positive: '$user with all your stakes of $stake $currency you are ahead with $profit $currency SeemsGood',
        negative: '$user with all your stakes of $stake $currency you are behind with $profit $currency LUL',
      },
    },
  },
};

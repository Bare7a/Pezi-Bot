import { env } from '../utils/Config';
import { IFlipCommand, Command } from '../types/models/Command';
import { CommandActionType, isFlipCommand } from '../types/utils/DB';

export const FlipCommand: CommandActionType<IFlipCommand> = {
  isValid: (command): command is Command<IFlipCommand> => isFlipCommand(command),
  execute: (user, params, command, db, bot): boolean => {
    const cost = db.Command.getCost(command, params[0], user);
    const currencyName = env.botCurrencyName;

    if (cost > user.points || cost <= 0) return false;
    const isWinning = Math.floor(Math.random() * 2) === 1;

    const multiplier = command.opts.multi;
    const reward = isWinning ? multiplier * cost : 0;
    const points = reward - cost;

    let message = isWinning ? command.opts.messages.won : command.opts.messages.lost;
    message = message
      .replaceAll('$user', user.username)
      .replaceAll('$cost', cost.toString())
      .replaceAll('$reward', reward.toString())
      .replaceAll('$multiplier', multiplier.toString())
      .replaceAll('$currency', currencyName);

    const Log = command.isLogEnabled ? db.Log : undefined;
    db.User.addPoints(user, cost, points, command.type, Log);
    bot.send(message);

    return true;
  },
  defaultConfig: {
    name: '!flip',
    type: 'FLIP',
    cost: 10,
    customCost: true,
    userCd: 300,
    globalCd: 0,
    cdMessage: '$user You can use $command after $cd seconds!',
    showCdMessage: true,
    isEnabled: true,
    onlyOnline: true,
    permissions: ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'],
    lastCalledAt: new Date(0),
    isLogEnabled: true,
    opts: {
      multi: 2,
      messages: {
        won: '$user flipped a coin VoteYea and won $reward $currency!',
        lost: '$user flipped a coin VoteNay and lost $cost $currency!',
      },
    },
  },
};

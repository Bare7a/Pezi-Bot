import { IDiceCommand, Command } from '../types/models/Command';
import { CommandActionType, isDiceCommand } from '../types/utils/DB';
import { env } from '../utils/Config';

export const DiceCommand: CommandActionType<IDiceCommand> = {
  isValid: (command): command is Command<IDiceCommand> => isDiceCommand(command),
  execute: (user, params, command, db, bot): boolean => {
    const cost = db.Command.getCost(command, params[0], user);
    const currencyName = env.botCurrencyName;

    if (cost > user.points || cost <= 0) return false;

    const dices = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];

    const dicesStr = `[${dices.join('] [')}]`;
    const dicesSum = dices.reduce((sum, a) => sum + a, 0);

    let multiplier = 0;
    const isWinning = dicesSum >= 12;
    if (dicesSum <= 15) multiplier = command.opts.multiS;
    if (dicesSum === 16) multiplier = command.opts.multiM;
    if (dicesSum === 17) multiplier = command.opts.multiL;
    if (dicesSum === 18) multiplier = command.opts.multiJ;

    const reward = isWinning ? multiplier * cost : 0;
    const points = reward - cost;

    let message = isWinning ? command.opts.messages.won : command.opts.messages.lost;
    message = message
      .replaceAll('$dices', dicesStr)
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
    name: '!dice',
    type: 'DICE',
    cost: 10,
    customCost: true,
    userCd: 600,
    globalCd: 0,
    cdMessage: '$user You can use $command after $cd seconds!',
    showCdMessage: true,
    isEnabled: true,
    onlyOnline: true,
    permissions: ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'],
    lastCalledAt: new Date(0),
    isLogEnabled: true,
    opts: {
      multiS: 2,
      multiM: 5,
      multiL: 15,
      multiJ: 50,
      messages: {
        won: '$user threw the dices $dices and won (x$multiplier) $reward $currency!',
        lost: '$user threw the dices $dices and lost $cost $currency!',
      },
    },
  },
};

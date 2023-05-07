import { IDiceCommand, isDiceCommand } from '@pezi-bot/shared';

import { CONFIG } from '../utils/Config';
import { Command } from '../models/Command';
import { CommandActionType } from '../types/Command';

export const DiceCommand: CommandActionType<IDiceCommand> = {
  defaultConfig: {
    name: '!dice',
    type: 'DICE',
    cost: 10,
    customCost: true,
    userCd: 600,
    lastCalledAt: new Date(0),
    globalCd: 0,
    cdMessage: '$user You can use $command after $cd seconds!',
    showCdMessage: true,
    isEnabled: true,
    onlyOnline: true,
    permission: ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'],
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
  isValid: (command): command is Command<IDiceCommand> => isDiceCommand(command),
  execute: async (user, params, command, bot) => {
    const cost = command.getCost(params[0], user);
    const currencyName = CONFIG.currencyName;

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

    await user.addPoints(cost, points, command.type, command.isLogEnabled);
    await bot.send(message);

    return true;
  },
};

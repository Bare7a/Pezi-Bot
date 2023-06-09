import { IFlipCommand, isFlipCommand } from '@pezi-bot/shared';

import { CONFIG } from '../utils/Config';
import { Command } from '../models/Command';
import { CommandActionType } from '../types/Command';

export const FlipCommand: CommandActionType<IFlipCommand> = {
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
    permission: ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'],
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
  isValid: (command): command is Command<IFlipCommand> => isFlipCommand(command),
  execute: async (user, params, command, bot) => {
    const cost = command.getCost(params[0], user);
    const currencyName = CONFIG.currencyName;

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

    await user.addPoints(cost, points, command.type, command.isLogEnabled);
    await bot.send(message);

    return true;
  },
};

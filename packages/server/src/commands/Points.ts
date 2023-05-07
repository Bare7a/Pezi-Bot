import { IPointsCommand, isPointsCommand } from '@pezi-bot/shared';

import { CONFIG } from '../utils/Config';
import { Command } from '../models/Command';
import { User } from '../models/User';
import { Log } from '../models/Log';
import { CommandActionType } from '../types/Command';

export const PointsCommand: CommandActionType<IPointsCommand> = {
  defaultConfig: {
    name: '!points',
    type: 'POINTS',
    cost: 0,
    customCost: false,
    userCd: 0,
    globalCd: 0,
    cdMessage: '$user You can use $command after $cd seconds!',
    showCdMessage: true,
    isEnabled: true,
    onlyOnline: false,
    permission: ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'],
    lastCalledAt: new Date(0),
    isLogEnabled: false,
    opts: {
      pointsMessages: [
        { minPoints: 0, message: '$user you have $points $currency NotLikeThis' },
        { minPoints: 100, message: '$user you have $points $currency LUL' },
        { minPoints: 500, message: '$user you have $points $currency SeemsGood' },
        { minPoints: 2500, message: '$user you have $points $currency Kappa' },
        { minPoints: 10000, message: '$user you have $points $currency KappaPride' },
      ],
    },
  },
  isValid: (command): command is Command<IPointsCommand> => isPointsCommand(command),
  execute: async (user, params, command, bot) => {
    const [modifier, username, valueStr] = params;
    const value = Math.abs(Math.floor(Number(valueStr)));

    const points = user.points;
    const currencyName = CONFIG.currencyName;

    if (user.isAdmin && username && value && ['add', 'set', 'remove'].includes(modifier)) {
      const userId = username.replace('@', '').toLowerCase();
      const target = await User.findOne({ where: { userId } });
      if (!target) return false;

      switch (modifier) {
        case 'add':
          await target.addPoints(0, value, command.type, command.isLogEnabled);
          return true;
        case 'set':
          await target.setPoints(0, value, command.type, command.isLogEnabled);
          return true;
        case 'remove':
          await target.removePoints(0, value, command.type, command.isLogEnabled);
          return true;
        default:
          return false;
      }
    }

    if (modifier === 'top') {
      const users = await User.findAll({ limit: 10, order: [['points', 'DESC']] });
      const message = users.map((user, index) => `[${index + 1}] ${user.username} (${user.points})`).join(' | ');
      await bot.send(message);
      return true;
    }

    if (user.isStreamer && modifier === 'reset') {
      await Promise.all([User.reset(), Log.reset()]);
      return true;
    }

    const pointsMessage = command.opts.pointsMessages
      .sort((a, b) => b.minPoints - a.minPoints)
      .find((pm) => points >= pm.minPoints);

    if (pointsMessage) {
      const message = pointsMessage.message
        .replaceAll('$user', user.username)
        .replaceAll('$points', points.toString())
        .replaceAll('$currency', currencyName);
      await bot.send(message);
      return true;
    }

    return false;
  },
};

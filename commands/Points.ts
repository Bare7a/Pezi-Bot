import { env } from '../utils/Config';
import { IPointsCommand, Command } from '../types/models/Command';
import { CommandActionType, isPointsCommand } from '../types/utils/DB';

export const PointsCommand: CommandActionType<IPointsCommand> = {
  isValid: (command): command is Command<IPointsCommand> => isPointsCommand(command),
  execute: (user, params, command, db, bot): boolean => {
    const [modifier, username, valueStr] = params;
    const value = Math.abs(Math.floor(Number(valueStr)));

    const points = user.points;
    const currencyName = env.botCurrencyName;

    if (user.isAdmin && username && value && ['add', 'set', 'remove'].includes(modifier)) {
      const userId = username.replace('@', '');
      const target = db.User.getByUsername(userId);
      if (!target) return false;

      const Log = command.isLogEnabled ? db.Log : undefined;
      switch (modifier) {
        case 'add':
          db.User.addPoints(target, 0, value, command.type, Log);
          return true;
        case 'set':
          db.User.setPoints(target, 0, value, command.type, Log);
          return true;
        case 'remove':
          db.User.removePoints(target, 0, value, command.type, Log);
          return true;
        default:
          return false;
      }
    }

    if (modifier === 'top') {
      const users = db.User.getTopUsers();
      const message = users.map((user, index) => `[${index + 1}] ${user.username} (${user.points})`).join(' | ');
      bot.send(message);
      return true;
    }

    if (user.isStreamer && modifier === 'reset') {
      db.Log.reset();
      db.User.reset();
      return true;
    }

    const pointsMessage = command.opts.pointsMessages
      .toSorted((a, b) => b.minPoints - a.minPoints)
      .find((pm) => points >= pm.minPoints);

    if (pointsMessage) {
      const message = pointsMessage.message
        .replaceAll('$user', user.username)
        .replaceAll('$points', points.toString())
        .replaceAll('$currency', currencyName);
      bot.send(message);
      return true;
    }

    return false;
  },
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
    permissions: ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'],
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
};

import { env } from '../utils/Config';
import { IWatchTimeCommand, Command } from '../types/models/Command';
import { CommandActionType, isWatchTimeCommand } from '../types/utils/DB';
import { User } from '../types/models/User';

export const WatchTimeCommand: CommandActionType<IWatchTimeCommand> = {
  isValid: (command): command is Command<IWatchTimeCommand> => isWatchTimeCommand(command),
  execute: (user, params, command, db, bot): boolean => {
    const cost = db.Command.getCost(command, params[0], user);
    if (cost > user.points) return false;

    const streamer = env.botStreamer;
    const watchTime = getWatchTime(user, command);

    const message = command.opts.messages.userWatchInfo
      .replaceAll('$user', user.username)
      .replaceAll('$streamer', streamer)
      .replaceAll('$watchTime', watchTime);

    bot.send(message);

    const Log = command.isLogEnabled ? db.Log : undefined;
    db.User.removePoints(user, cost, cost, command.type, Log);

    return true;
  },
  defaultConfig: {
    name: '!watchtime',
    type: 'WATCH_TIME',
    cost: 0,
    customCost: false,
    userCd: 300,
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
        userWatchInfo: '$user has watched $streamer for $watchTime',
        minutes: 'minutes',
        hours: 'hours',
        days: 'days',
      },
    },
  },
};

const getWatchTime = (user: User, command: Command<IWatchTimeCommand>): string => {
  let remaining = Math.floor(user.watchTime);

  const watchTime = [
    { name: command.opts.messages.days, value: 86400 },
    { name: command.opts.messages.hours, value: 3600 },
    { name: command.opts.messages.minutes, value: 60 },
  ]
    .map(({ name, value }) => {
      const amount = Math.floor(remaining / value);
      remaining %= value;

      return amount > 0 ? `${amount} ${name}` : null;
    })
    .filter(Boolean)
    .join(' ');

  return watchTime;
};

import { IAdminCommand, isAdminCommand } from '@pezi-bot/db';

import { Command, User } from '../models';
import { CommandActionType } from '../types';

export const AdminCommand: CommandActionType<IAdminCommand> = {
  defaultConfig: {
    name: '!admin',
    type: 'ADMIN',
    cost: 0,
    customCost: false,
    userCd: 0,
    globalCd: 0,
    cdMessage: '$user You can use $command after $cd seconds!',
    showCdMessage: true,
    isEnabled: true,
    onlyOnline: false,
    permission: ['streamer'],
    lastCalledAt: new Date(0),
    isLogEnabled: false,
    opts: {
      messages: {
        add: '$user added $target as admin',
        remove: '$user removed $target from admins',
      },
    },
  },
  isValid: (command): command is Command<IAdminCommand> => isAdminCommand(command),
  execute: async (user, params, command, bot) => {
    const [modifier, username] = params;
    if (!modifier || !username) return false;

    const userId = username.replace('@', '').toLowerCase();
    const target = await User.findOne({ where: { userId, isStreamer: false } });
    if (!target) return false;

    let message;
    switch (modifier) {
      case 'add':
        message = command.opts.messages.add;
        await target.update({ isAdmin: true });
        break;
      case 'remove':
        message = command.opts.messages.remove;
        await target.update({ isAdmin: false });
        break;
      default:
        return false;
    }

    message = message.replaceAll('$user', user.username).replaceAll('$target', target.username);
    await bot.send(message);

    return true;
  },
};

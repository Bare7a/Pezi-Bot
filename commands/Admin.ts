import { IAdminCommand, Command } from '../types/models/Command';
import { CommandActionType, isAdminCommand } from '../types/utils/DB';

export const AdminCommand: CommandActionType<IAdminCommand> = {
  isValid: (command): command is Command<IAdminCommand> => isAdminCommand(command),
  execute: (user, params, command, db, bot): boolean => {
    const [modifier, username] = params;
    if (!modifier || !username) return false;

    const userId = username.replace('@', '').toLowerCase();
    const target = db.User.getById(userId);
    if (!target) return false;

    let message;
    switch (modifier) {
      case 'add':
        message = command.opts.messages.add;
        db.User.update({ ...target, isAdmin: true });
        break;
      case 'remove':
        message = command.opts.messages.remove;
        db.User.update({ ...target, isAdmin: false });
        break;
      default:
        return false;
    }

    message = message.replaceAll('$user', user.username).replaceAll('$target', target.username);
    bot.send(message);

    return true;
  },
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
    permissions: ['streamer'],
    lastCalledAt: new Date(0),
    isLogEnabled: false,
    opts: {
      messages: {
        add: '$user added $target as admin',
        remove: '$user removed $target from admins',
      },
    },
  },
};

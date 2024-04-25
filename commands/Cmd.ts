import { ICmdCommand, Command } from '../types/models/Command';
import { CommandActionType, isCmdCommand } from '../types/utils/DB';

export const CmdCommand: CommandActionType<ICmdCommand> = {
  isValid: (command): command is Command<ICmdCommand> => isCmdCommand(command),
  execute: (user, params, command, db, bot): boolean => {
    const [modifier, name, valueStr] = params;
    const cd = Number(valueStr) ? Number(valueStr) : NaN;
    if (!modifier || !name) return false;

    const cmd = db.Command.fetchByName(name);
    if (!cmd || cmd.type === 'ADMIN') return false;

    let message;
    switch (modifier) {
      case 'enable':
        message = command.opts.messages.enable;
        db.Command.update({ ...cmd, isEnabled: true });
        break;
      case 'disable':
        message = command.opts.messages.disable;
        db.Command.update({ ...cmd, isEnabled: false });
        break;
      case 'ucd':
        message = command.opts.messages.userCd;
        db.Command.update({ ...cmd, userCd: cd });
        break;
      case 'gcd':
        message = command.opts.messages.userCd;
        db.Command.update({ ...cmd, globalCd: cd });
        break;
      default:
        return false;
    }

    message = message
      .replaceAll('$user', user.username)
      .replaceAll('$command', cmd.name)
      .replaceAll('$cd', cd.toString());
    bot.send(message);

    return true;
  },
  defaultConfig: {
    name: '!cmd',
    type: 'CMD',
    cost: 0,
    customCost: false,
    userCd: 0,
    globalCd: 0,
    cdMessage: '$user You can use $command after $cd seconds!',
    showCdMessage: true,
    isEnabled: true,
    onlyOnline: false,
    permissions: ['streamer', 'admin', 'mod'],
    lastCalledAt: new Date(0),
    isLogEnabled: false,
    opts: {
      messages: {
        enable: '$user enable the command $command',
        disable: '$user disabled the command $command',
        userCd: '$user changed the user CD for $command to $cd',
        globalCd: '$user changed the user CD for $command to $cd',
      },
    },
  },
};

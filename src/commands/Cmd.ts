import { Command } from '../db';
import { ICmdCommand, CommandActionType } from '../types';

export const CmdCommand: CommandActionType<ICmdCommand> = {
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
    permission: ['streamer', 'admin', 'mod'],
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
  isValid: (command): command is Command<ICmdCommand> => command.type === CmdCommand.defaultConfig.type,
  execute: async (user, params, command, bot) => {
    const [modifier, name, valueStr] = params;
    const cd = Number(valueStr) ? Number(valueStr) : NaN;
    if (!modifier || !name) return false;

    const cmd = await Command.findOne({ where: { name: name } });
    if (!cmd || cmd.type === 'ADMIN') return false;

    let message;
    switch (modifier) {
      case 'enable':
        message = command.opts.messages.enable;
        await cmd.update({ isEnabled: false });
        break;
      case 'disable':
        message = command.opts.messages.disable;
        await cmd.update({ isEnabled: false });
        break;
      case 'ucd':
        message = command.opts.messages.userCd;
        await cmd.update({ userCd: cd });
        break;
      case 'gcd':
        message = command.opts.messages.userCd;
        await cmd.update({ globalCd: cd });
        break;
      default:
        return false;
    }

    message = message
      .replaceAll('$user', user.username)
      .replaceAll('$command', cmd.name)
      .replaceAll('$cd', cd.toString());
    await bot.send(message);

    return true;
  },
};

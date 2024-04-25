import { IMessageCommand, Command } from '../types/models/Command';
import { CommandActionType, isMessageCommand } from '../types/utils/DB';

export const MessageCommand: CommandActionType<IMessageCommand> = {
  isValid: (command): command is Command<IMessageCommand> => isMessageCommand(command),
  execute: (user, params, command, _, bot): boolean => {
    let message = command.opts.message;
    for (const [i, target] of params.entries()) {
      message = message.replaceAll(`$target${i + 1}`, target.replace('@', ''));
    }

    if (message.includes('$target')) return false;
    message = message.replace('$user', user.username);

    bot.send(message);
    return true;
  },
  defaultConfig: {
    name: '!slap',
    type: 'MESSAGE',
    cost: 0,
    customCost: false,
    userCd: 60,
    globalCd: 0,
    cdMessage: '$user You can use $command after $cd seconds!',
    showCdMessage: true,
    isEnabled: true,
    onlyOnline: false,
    permissions: ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'],
    lastCalledAt: new Date(0),
    isLogEnabled: false,
    opts: {
      message: '$user slapped $target1',
    },
  },
};

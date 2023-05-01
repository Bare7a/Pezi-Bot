import { IMessageCommand, isMessageCommand } from '@pezi-bot/db';

import { Command } from '../models/Command';
import { CommandActionType } from '../types/Command';

export const MessageCommand: CommandActionType<IMessageCommand> = {
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
    permission: ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'],
    lastCalledAt: new Date(0),
    isLogEnabled: false,
    opts: {
      message: '$user slapped $target1',
    },
  },
  isValid: (command): command is Command<IMessageCommand> => isMessageCommand(command),
  execute: async (user, params, command, bot): Promise<boolean> => {
    let message = command.opts.message;
    for (const [i, target] of params.entries()) {
      message = message.replaceAll(`$target${i + 1}`, target.replace('@', ''));
    }

    if (message.includes('$target')) return false;
    message = message.replace('$user', user.username);

    await bot.send(message);
    return true;
  },
};

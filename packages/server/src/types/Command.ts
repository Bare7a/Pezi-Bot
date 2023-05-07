import { CommandType, ICommand } from '@pezi-bot/shared';

import { Command } from '../models/Command';
import { User } from '../models/User';
import { TwitchClient } from '../utils/Bot';

export type CommandActionType<T extends ICommand> = {
  defaultConfig: CommandType<T>;
  isValid(command: Command<ICommand>): command is Command<T>;
  execute(user: User, params: string[], command: Command<T>, bot: TwitchClient): Promise<boolean>;
};

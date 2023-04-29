import { CommandType, ICommand } from '@pezi-bot/db';

import { Command, User } from '../models';
import { TwitchClient } from '../utils';

export type CommandActionType<T extends ICommand> = {
  defaultConfig: CommandType<T>;
  isValid(command: Command<ICommand>): command is Command<T>;
  execute(user: User, params: string[], command: Command<T>, bot: TwitchClient): Promise<boolean>;
};

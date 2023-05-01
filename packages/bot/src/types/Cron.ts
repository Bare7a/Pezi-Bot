import { CronType, ICron } from '@pezi-bot/db';
import { Cron } from '../models/Cron';
import { TwitchClient } from '../utils/Bot';

export type CronActionType<T extends ICron> = {
  defaultConfig: CronType<T>;
  isValid(cron: Cron<ICron>): cron is Cron<T>;
  execute(bot: TwitchClient): Promise<boolean>;
};

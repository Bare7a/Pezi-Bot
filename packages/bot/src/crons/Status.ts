import { ICron, StatusCronType, isStatusCron } from '@pezi-bot/db';

import { Cron } from '../models/Cron';
import { Api } from '../utils/Api';
import { CronActionType } from '../types/Cron';
import { TwitchClient } from '../utils/Bot';

export const StatusCron: CronActionType<StatusCronType> = {
  defaultConfig: {
    type: 'STATUS',
    interval: 60,
    isEnabled: true,
    isExecuting: false,
    isLogEnabled: true,
    lastCalledAt: new Date(0),
    callAt: new Date(0),
    opts: {
      isOnline: false,
    },
  },

  isValid: (cron: Cron<ICron>): cron is Cron<StatusCronType> => isStatusCron(cron),

  execute: async function (_: TwitchClient): Promise<boolean> {
    try {
      const statusCron = await Cron.fetch<StatusCronType>('STATUS');
      const isExecutionTime = statusCron.isExecutePermited();

      if (!isExecutionTime) return false;

      statusCron.isExecuting = true;
      await statusCron.save();
      const isStreamOnline = await Api.isStreamOnline();

      statusCron.isExecuting = false;
      statusCron.lastCalledAt = new Date();
      statusCron.callAt = statusCron.getCallAtDate();
      statusCron.opts.isOnline = isStreamOnline;
      statusCron.changed('opts', true);

      await statusCron.save();
      console.log(` *** Stream online status: ${isStreamOnline} *** `);

      return true;
    } catch (ex) {
      console.log(`There was an error while running updateStreamStatus`);
      console.log(ex);

      return false;
    }
  },
};

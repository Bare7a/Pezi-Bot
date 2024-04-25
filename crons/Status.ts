import { TwitchActions } from '../types/utils/Twitch';
import { StatusCronType, Cron, ICron } from '../types/models/Cron';
import { CronActionType, isStatusCron, DbActions } from '../types/utils/DB';

export const StatusCron: CronActionType<StatusCronType> = {
  isValid: (cron: Cron<ICron>): cron is Cron<StatusCronType> => isStatusCron(cron),
  execute: async function (db: DbActions, bot: TwitchActions): Promise<boolean> {
    try {
      const statusCron = db.Cron.fetch<StatusCronType>('STATUS');
      const isExecutionTime = db.Cron.isExecutePermited(statusCron);

      if (!isExecutionTime) return false;

      statusCron.isExecuting = true;
      db.Cron.update('STATUS', statusCron);
      const isStreamOnline = await bot.isStreamOnline();

      statusCron.isExecuting = false;
      statusCron.lastCalledAt = new Date();
      statusCron.callAt = db.Cron.getCallAtDate(statusCron, statusCron.interval);
      statusCron.opts.isOnline = isStreamOnline;

      db.Cron.update('STATUS', statusCron);
      console.log(` *** Stream online status: ${isStreamOnline} *** `);

      return true;
    } catch (ex) {
      console.log(`There was an error while running updateStreamStatus`);
      console.log(ex);

      return false;
    }
  },
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
};

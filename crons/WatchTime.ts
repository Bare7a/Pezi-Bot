import { TwitchActions } from '../types/utils/Twitch';
import { DbActions, CronActionType, isWatchTimeCron } from '../types/utils/DB';
import { Cron, WatchTimeCronType, UserRoleMapType, ICron, StatusCronType } from '../types/models/Cron';

export const WatchTimeCron: CronActionType<WatchTimeCronType> = {
  isValid: (cron: Cron<ICron>): cron is Cron<WatchTimeCronType> => isWatchTimeCron(cron),
  execute: async (db: DbActions, bot: TwitchActions): Promise<boolean> => {
    try {
      const cronStatus = db.Cron.fetch<StatusCronType>('STATUS');
      const cronWatchTime = db.Cron.fetch<WatchTimeCronType>('WATCH_TIME');

      const isStreamOnline = cronStatus.opts.isOnline;
      const isExecutionTime = db.Cron.isExecutePermited(cronWatchTime);

      if (!isExecutionTime || !isStreamOnline) return false;

      cronWatchTime.isExecuting = true;
      db.Cron.update<WatchTimeCronType>('WATCH_TIME', cronWatchTime);

      const watchTime = cronStatus.interval;
      const viewerIds = await bot.getViewerUserIds();

      const users = db.User.getByIds(viewerIds);
      const userIds = users.map((user) => user.userId);

      console.log(` *** Updating watch time for ${users.length} users *** `);
      db.User.addWatchTimeInBulk(userIds, watchTime);

      cronWatchTime.isExecuting = false;
      cronWatchTime.lastCalledAt = new Date();
      cronWatchTime.callAt = db.Cron.getCallAtDate(cronWatchTime);
      db.Cron.update<WatchTimeCronType>('WATCH_TIME', cronWatchTime);

      return true;
    } catch (ex) {
      console.log(`There was an error while running the giveViewersWatchTime`);
      console.log(ex);

      return false;
    }
  },
  defaultConfig: {
    type: 'WATCH_TIME',
    interval: 60,
    isEnabled: true,
    isExecuting: false,
    isLogEnabled: false,
    lastCalledAt: new Date(0),
    callAt: new Date(0),
    opts: {},
  },
};

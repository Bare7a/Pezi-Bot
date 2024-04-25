import { Log } from '../types/models/Log';
import { TwitchActions } from '../types/utils/Twitch';
import { UserRoleType, User } from '../types/models/User';
import { DbActions, CronActionType, isRewardCron } from '../types/utils/DB';
import { Cron, RewardCronType, UserRoleMapType, RewardType, ICron, StatusCronType } from '../types/models/Cron';

const getUserRoleMap = () => {
  const userRoleMap = new Map<UserRoleType, User[]>();
  const allRoles: UserRoleType[] = ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'];
  for (const role of allRoles) userRoleMap.set(role, []);

  return userRoleMap;
};

const getUserLogsMap = (users: User[], cronReward: Cron<RewardCronType>) => {
  const logs = new Map<number, Log>();
  const dateNow = new Date();

  for (const user of users) {
    logs.set(user.id, {
      id: 0,
      userId: user.userId,
      allPoints: user.points,
      cost: 0,
      points: 0,
      type: cronReward.type,
      updatedAt: dateNow,
      createdAt: dateNow,
    });
  }

  return logs;
};

const giveUsersReward = (db: DbActions, roleUsers: UserRoleMapType, reward: RewardType) => {
  for (const [role, users] of roleUsers.entries()) {
    if (users.length === 0) continue;

    const userIds = users.map((user) => user.userId);
    const pointsToAdd = reward[role];

    db.User.addPointsInBulk(userIds, 0, pointsToAdd);
  }
};

export const RewardCron: CronActionType<RewardCronType> = {
  isValid: (cron: Cron<ICron>): cron is Cron<RewardCronType> => isRewardCron(cron),
  execute: async (db: DbActions, bot: TwitchActions): Promise<boolean> => {
    try {
      const cronStatus = db.Cron.fetch<StatusCronType>('STATUS');
      const cronReward = db.Cron.fetch<RewardCronType>('REWARD');

      const isStreamOnline = cronStatus.opts.isOnline;
      const isExecutionTime = db.Cron.isExecutePermited(cronReward);

      if (!isExecutionTime || !isStreamOnline) return false;

      cronReward.isExecuting = true;
      db.Cron.update<RewardCronType>('REWARD', cronReward);

      const viewerIds = await bot.getViewerUserIds();
      const viewReward = cronReward.opts.view;
      const chatReward = cronReward.opts.chat;

      const users = db.User.getByIds(viewerIds);

      console.log(` *** Giving points to ${users.length} users *** `);
      const viewUsers = getUserRoleMap();
      const chatUsers = getUserRoleMap();
      const logsUsers = getUserLogsMap(users, cronReward);

      for (const user of users) {
        const userRole = db.User.getRole(user);
        const isChatter = cronReward.opts.chatters[user.userId];

        const viewPoints = viewReward[userRole];
        const chatPoints = chatReward[userRole];

        const logMap = logsUsers.get(user.id);
        const viewMap = viewUsers.get(userRole);
        const chatMap = chatUsers.get(userRole);

        if (!logMap || !viewMap) continue;
        viewMap.push(user);
        logMap.points += viewPoints;
        logMap.allPoints += viewPoints;

        if (!isChatter || !chatMap) continue;
        chatMap.push(user);
        logMap.points += chatPoints;
        logMap.allPoints += chatPoints;
      }

      giveUsersReward(db, viewUsers, viewReward);
      giveUsersReward(db, chatUsers, chatReward);

      const logs = Array.from(logsUsers.values());
      db.Log.insertBulk(logs);

      cronReward.isExecuting = false;
      cronReward.lastCalledAt = new Date();
      cronReward.callAt = db.Cron.getCallAtDate(cronReward);
      cronReward.opts.chatters = {};
      db.Cron.update<RewardCronType>('REWARD', cronReward);

      return true;
    } catch (ex) {
      console.log(`There was an error while running the giveViewersReward`);
      console.log(ex);

      return false;
    }
  },
  defaultConfig: {
    type: 'REWARD',
    interval: 300,
    isEnabled: true,
    isExecuting: false,
    isLogEnabled: true,
    lastCalledAt: new Date(0),
    callAt: new Date(0),
    opts: {
      chatters: {},
      view: {
        streamer: 6,
        admin: 6,
        mod: 6,
        vip: 6,
        sub: 10,
        member: 5,
      },
      chat: {
        streamer: 2,
        admin: 2,
        mod: 2,
        vip: 2,
        sub: 2,
        member: 2,
      },
    },
  },
};

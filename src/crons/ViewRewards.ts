import { Op } from 'sequelize';

import { Cron, User, Log } from '../db';
import { LogType, RewardCronType, StatusCronType } from '../types';
import { UserRoleType } from '../types/User';
import { Api } from '../utils';

type RewardType = { [key in UserRoleType]: number };
type UserRoleMapType = Map<UserRoleType, User[]>;

const getUserRoleMap = () => {
  const userRoleMap = new Map<UserRoleType, User[]>();
  const allRoles: UserRoleType[] = ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'];
  for (const role of allRoles) userRoleMap.set(role, []);

  return userRoleMap;
};

const getUserLogsMap = (users: User[], cronRewards: Cron<RewardCronType>) => {
  const logs = new Map<number, LogType>();

  for (const user of users) {
    logs.set(user.id, {
      userId: user.username,
      allPoints: user.points,
      cost: 0,
      points: 0,
      type: cronRewards.type,
    });
  }

  return logs;
};

const giveUsersRewards = (roleUsers: UserRoleMapType, rewards: RewardType, promises: Promise<any>[]) => {
  for (const [role, users] of roleUsers.entries()) {
    if (users.length === 0) continue;

    const userIds = users.map((user) => user.id);
    const pointsToAdd = rewards[role];

    promises.push(User.increment({ points: pointsToAdd }, { where: { id: { [Op.in]: userIds } } }));
  }
};

export const giveViewersRewards = async () => {
  try {
    const [cronStatus, cronRewards] = await Promise.all([
      Cron.fetch<StatusCronType>('STATUS'),
      Cron.fetch<RewardCronType>('REWARDS'),
    ]);

    const isStreamOnline = cronStatus.opts.isOnline;
    const isExecutionTime = cronRewards.isExecutePermited();

    if (!isExecutionTime || !isStreamOnline) return false;

    cronRewards.isExecuting = true;
    await cronRewards.save();

    const viewerIds = await Api.getViewerUserIds();
    const viewRewards = cronRewards.opts.view;
    const chatRewards = cronRewards.opts.chat;

    const users = await User.findAll({ where: { userId: { [Op.in]: viewerIds } } });

    console.log(` *** Giving points to ${users.length} users *** `);
    const viewUsers = getUserRoleMap();
    const chatUsers = getUserRoleMap();
    const logsUsers = getUserLogsMap(users, cronRewards);

    for (const user of users) {
      const userRole = user.getRoleType();
      const isChatter = cronRewards.opts.chatters[user.userId];

      const viewPoints = viewRewards[userRole];
      const chatPoints = chatRewards[userRole];

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

    const promises: Promise<any>[] = [];
    giveUsersRewards(viewUsers, viewRewards, promises);
    giveUsersRewards(chatUsers, chatRewards, promises);

    const logs = Array.from(logsUsers.values());
    promises.push(Log.bulkCreate(logs));

    cronRewards.isExecuting = false;
    cronRewards.lastCalledAt = new Date();
    cronRewards.callAt = cronRewards.getCallAtDate();
    cronRewards.opts.chatters = {};
    cronRewards.changed('opts', true);

    promises.push(cronRewards.save());
    await Promise.all(promises);

    return true;
  } catch (ex) {
    console.log(`There was an error while running the giveViewersRewards`);
    console.log(ex);

    return false;
  }
};

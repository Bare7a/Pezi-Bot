import { ChatUserstate } from 'tmi.js';
import { User as DBUser, RewardCronType, UserRoleType, UserType } from '@pezi-bot/db';

import { Cron } from './Cron';
import { Log } from './Log';
import { CONFIG } from '../utils/Config';
import { ValidUserState } from '../types/User';

export class User extends DBUser {
  static isValidUserState = (account: ChatUserstate): account is ValidUserState => 'display-name' in account;

  static getUserFromAcc = (userstate: ValidUserState): UserType => {
    const user = {
      userId: userstate['username'],
      username: userstate['display-name'],
      points: CONFIG.defaultPoints,
      color: userstate['color'],
      isVIP: !!userstate['badges']?.vip,
      isMod: !!userstate['badges']?.moderator,
      isSub: !!userstate['subscriber'],
      isStreamer: !!userstate['badges']?.broadcaster,
      isAdmin: !!userstate['badges']?.broadcaster,
      commands: {},
    };

    return user;
  };

  static async fetch(userstate: ValidUserState): Promise<User> {
    const newUser = User.getUserFromAcc(userstate);
    const oldUser = await User.findOne({ where: { userId: newUser.userId } });

    if (!oldUser) {
      const user = await User.create(newUser);
      return user;
    }

    if (
      newUser.username !== oldUser.username ||
      newUser.color !== oldUser.color ||
      newUser.isStreamer !== oldUser.isStreamer ||
      // newUser.isAdmin !== oldUser.isAdmin ||
      newUser.isMod !== oldUser.isMod ||
      newUser.isSub !== oldUser.isSub ||
      newUser.isVIP !== oldUser.isVIP
    ) {
      oldUser.username = newUser.username;
      oldUser.color = newUser.color;
      oldUser.isStreamer = newUser.isStreamer;
      // oldUser.isAdmin = newUser.isAdmin;
      oldUser.isMod = newUser.isMod;
      oldUser.isSub = newUser.isSub;
      oldUser.isVIP = newUser.isVIP;
      await oldUser.save();
    }

    return oldUser;
  }

  static async reset() {
    await User.update({ points: 0, commands: {} }, { where: {} });
    return true;
  }

  async addAsChatter(): Promise<Boolean> {
    const cronRewards = await Cron.fetch<RewardCronType>('REWARDS');

    const isChatter = cronRewards.opts.chatters[this.userId];
    if (isChatter) return false;

    cronRewards.opts.chatters[this.userId] = true;
    cronRewards.changed('opts', true);

    await cronRewards.save();
    return true;
  }

  getRoleType(): UserRoleType {
    const user = this;
    if (user.isStreamer) return 'streamer';
    if (user.isAdmin) return 'admin';
    if (user.isMod) return 'mod';
    if (user.isVIP) return 'vip';
    if (user.isSub) return 'sub';
    return 'member';
  }

  async addPoints(cost: number, points: number, type: string, log: boolean) {
    const user = this;
    const userId = user.userId;
    const allPoints = user.points + points;

    const promises = [];
    if (log) promises.push(Log.create({ type, userId, cost, points, allPoints }));
    promises.push(user.increment({ points }));

    await Promise.all(promises);

    return true;
  }

  async setPoints(cost: number, points: number, type: string, log: boolean) {
    const user = this;
    const userId = user.userId;
    const allPoints = points;

    const promises = [];
    if (log) promises.push(Log.create({ type, userId, cost, points: 0, allPoints }));
    promises.push(user.update({ points }));
    await Promise.all(promises);

    return true;
  }

  async removePoints(cost: number, points: number, type: string, log: boolean) {
    const user = this;
    const userId = user.userId;
    const allPoints = user.points - points;

    const promises = [];
    if (log) promises.push(Log.create({ type, userId, cost, points, allPoints }));
    promises.push(user.decrement({ points }));

    await Promise.all(promises);

    return true;
  }
}

import { Optional } from 'sequelize/types';
import { Table, Model, Column, DataType } from 'sequelize-typescript';
import { UserType, UserRoleType, ValidUserState, ICommand, StatusCronType, RewardCronType } from '../types';
import { Cron } from './Cron';
import { Command, Log } from '.';
import { CONFIG } from '../utils';
import { ChatUserstate } from 'tmi.js';

type UserCreationAttributes = Optional<UserType, 'id'>;

@Table
export class User extends Model<UserType, UserCreationAttributes> implements UserType {
  @Column(DataType.TEXT)
  declare userId: string;

  @Column(DataType.TEXT)
  declare username: string;

  @Column(DataType.NUMBER)
  declare points: number;

  @Column(DataType.TEXT)
  declare color?: string;

  @Column(DataType.BOOLEAN)
  declare isSub: boolean;

  @Column(DataType.BOOLEAN)
  declare isVIP: boolean;

  @Column(DataType.BOOLEAN)
  declare isMod: boolean;

  @Column(DataType.BOOLEAN)
  declare isAdmin: boolean;

  @Column(DataType.BOOLEAN)
  declare isStreamer: boolean;

  @Column(DataType.JSON)
  declare commands: { [key: string]: string };

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

  async canExecuteCommand(command: Command<ICommand>): Promise<Boolean> {
    const user = this;
    const currentTime = new Date();

    const cronStatus = await Cron.fetch<StatusCronType>('STATUS');

    const userRoleType = user.getRoleType();
    const isStreamOnline = cronStatus.opts.isOnline;

    const userCd = command.userCd;
    const globalCd = command.globalCd;
    const userLastCallTimeStr = user.commands[command.type];

    const userLastCallTime = userLastCallTimeStr ? new Date(userLastCallTimeStr) : new Date(0);
    const globalLastCallTime = command.lastCalledAt ?? new Date(0);

    const isUserTimeAvailable = (currentTime.getTime() - userLastCallTime.getTime()) / 1000 >= userCd;
    const isGlobalTimeAvailable = (currentTime.getTime() - globalLastCallTime.getTime()) / 1000 >= globalCd;

    const isUserPermitted = command.permission.includes(userRoleType);
    const isCommandEnabled = command.isEnabled && ((isStreamOnline && command.onlyOnline) || !command.onlyOnline);
    const isCdTimeAvailable = isUserTimeAvailable && isGlobalTimeAvailable;

    const isCommandExecutable = isCommandEnabled && isUserPermitted && isCdTimeAvailable;
    return isCommandExecutable;
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

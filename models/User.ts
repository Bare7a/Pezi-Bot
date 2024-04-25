import { env } from '../utils/Config';
import { LogEntity } from './Log';
import { CronEntity } from './Cron';
import { UserMessage } from '../types/utils/Twitch';
import { RewardCronType } from '../types/models/Cron';
import { UserActions, DatabaseConnection } from '../types/utils/DB';
import { DbUser, User, UserTable, UserRoleType } from '../types/models/User';

export class UserEntity implements UserActions {
  constructor(private dbConn: DatabaseConnection) {}

  private parse = (userDb: DbUser): User => ({
    ...userDb,
    isSub: !!userDb.isSub,
    isVip: !!userDb.isVip,
    isMod: !!userDb.isMod,
    isAdmin: !!userDb.isAdmin,
    isStreamer: !!userDb.isStreamer,
    commands: this.commandParse(userDb.commands),
    createdAt: new Date(userDb.createdAt),
    updatedAt: new Date(userDb.updatedAt),
  });

  private parseToDb = (user: User): Omit<DbUser, 'id'> => {
    const { id, ...userDb } = user;
    return {
      ...userDb,
      commands: JSON.stringify(user.commands),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  };

  private commandParse = (text: string): Record<string, Date> =>
    Object.entries<string>(JSON.parse(text)).reduce((obj, [key, value]) => ({ ...obj, [key]: new Date(value) }), {});

  public getById = (userId: string): User | null => {
    const userDb = this.dbConn.getOne<UserTable>('Users', { where: { eq: { userId } } });
    if (!userDb) return null;

    const user = this.parse(userDb);
    return user;
  };

  public getByIds = (userIds: string[]): User[] => {
    const usersDb = this.dbConn.getMany<UserTable>('Users', { where: { an: { userId: userIds } } });
    if (!usersDb) return [];

    const users = usersDb.map(this.parse);
    return users;
  };

  public getByUsername = (username: string): User | null => {
    const userDb = this.dbConn.getOne<UserTable>('Users', { where: { eq: { username } } });
    if (!userDb) return null;

    const user = this.parse(userDb);
    return user;
  };

  private insert = (newUser: UserMessage): User => {
    const userDb = this.dbConn.insertOne<UserTable>('Users', {
      userId: newUser.userId,
      username: newUser.username,
      color: newUser.color,
      points: env.botDefaultPoints,
      commands: '{}',
      isSub: newUser.isSub,
      isVip: newUser.isVip,
      isMod: newUser.isMod,
      isAdmin: newUser.isAdmin,
      isStreamer: newUser.isStreamer,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const user = this.parse(userDb);
    return user;
  };

  public sync = (newUser: UserMessage): User => {
    const oldUser = this.getById(newUser.userId);

    if (!oldUser) {
      const user = this.insert(newUser);
      return user;
    }

    if (
      newUser.username !== oldUser.username ||
      newUser.color !== oldUser.color ||
      newUser.isStreamer !== oldUser.isStreamer ||
      newUser.isMod !== oldUser.isMod ||
      newUser.isSub !== oldUser.isSub ||
      newUser.isVip !== oldUser.isVip
    ) {
      const updatedUser = this.dbConn.updateOne<UserTable>(
        'Users',
        {
          username: newUser.username,
          color: newUser.color,
          isStreamer: newUser.isStreamer,
          isMod: newUser.isMod,
          isSub: newUser.isSub,
          isVip: newUser.isVip,
        },
        { eq: { userId: oldUser.userId } }
      );

      return this.parse(updatedUser);
    }

    return oldUser;
  };

  public getTopUsers(): User[] {
    const usersDb = this.dbConn.getMany<UserTable>('Users', { order: { points: 'DESC' }, limit: 10 });
    const users = usersDb.map(this.parse);
    return users;
  }

  public update = (user: User): User => {
    const updatedUser = this.dbConn.updateOne<UserTable>('Users', this.parseToDb(user), { eq: { id: user.id } });
    return this.parse(updatedUser);
  };

  public reset = () => this.dbConn.updateMany<UserTable>('Users', { points: env.botDefaultPoints });

  public addAsChatter(user: User, Cron: CronEntity): boolean {
    const cronRewards = Cron.fetch<RewardCronType>('REWARD');

    const isChatter = cronRewards.opts.chatters[user.userId];
    if (isChatter) return false;

    cronRewards.opts.chatters[user.userId] = true;
    Cron.update<RewardCronType>('REWARD', cronRewards);

    return true;
  }

  public getRole = (user: User): UserRoleType => {
    if (user.isStreamer) return 'streamer';
    if (user.isAdmin) return 'admin';
    if (user.isMod) return 'mod';
    if (user.isVip) return 'vip';
    if (user.isSub) return 'sub';
    return 'member';
  };

  public addPoints = (user: User, cost: number, points: number, type: string, Log?: LogEntity) => {
    this.dbConn.incrementOne<UserTable>('Users', { points }, { eq: { userId: user.userId } });

    if (!user) return false;
    if (Log) Log.insert(type, user.userId, cost, points, user.points);
    user.points += points;

    return true;
  };

  public addPointsInBulk = (userIds: string[], cost: number, points: number) => {
    const users = this.dbConn.incrementMany<UserTable>('Users', { points }, { an: { userId: userIds } });
    if (users.length === 0) return false;

    return true;
  };

  public setPoints = (user: User, cost: number, points: number, type: string, Log?: LogEntity) => {
    this.dbConn.updateOne<UserTable>('Users', { points }, { eq: { userId: user.userId } });

    if (!user) return false;
    if (Log) Log.insert(type, user.userId, cost, 0, points);
    user.points = points;

    return true;
  };

  public removePoints = (user: User, cost: number, points: number, type: string, Log?: LogEntity) => {
    this.dbConn.decrementOne<UserTable>('Users', { points }, { eq: { userId: user.userId } });

    if (!user) return false;
    if (Log) Log.insert(type, user.userId, cost, points, user.points);
    user.points -= points;

    return true;
  };
}

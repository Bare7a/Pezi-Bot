import { UserRoleType, User } from './User';

export type CronType = 'RAFFLE' | 'REWARD' | 'STATUS' | 'TRIVIA';

export type RaffleCronType = {
  type: 'RAFFLE';
  opts: RaffleCronOptions;
};

export type RaffleCronOptions = {
  pot: number;
  userList: [string, number][];
  isBettingOpened: boolean;
};

export type RewardCronType = {
  type: 'REWARD';
  opts: RewardCronOptions;
};

export type RewardCronOptions = {
  view: {
    [key in UserRoleType]: number;
  };
  chat: {
    [key in UserRoleType]: number;
  };
  chatters: {
    [key: string]: true;
  };
};

export type StatusCronType = {
  type: 'STATUS';
  opts: StatusCronOptions;
};

export type StatusCronOptions = {
  isOnline: boolean;
};

export type TriviaCronType = {
  type: 'TRIVIA';
  opts: TriviaCronOptions;
};

export type TriviaCronOptions = {
  prize?: number;
  answers?: string[];
  question?: string;
  previousQuestions: Record<string, true>;
};

export type ICron = RaffleCronType | RewardCronType | StatusCronType | TriviaCronType;

export type RewardType = { [key in UserRoleType]: number };
export type UserRoleMapType = Map<UserRoleType, User[]>;

export type GenericCron = {
  id: number;
  interval: number;
  isEnabled: boolean;
  isExecuting: boolean;
  isLogEnabled: boolean;
};

export type DbCron = GenericCron & {
  type: string;
  lastCalledAt: string;
  callAt: string;
  createdAt: string;
  updatedAt: string;
  opts: string;
};

export type Cron<T extends ICron> = GenericCron & {
  type: T['type'];
  lastCalledAt: Date;
  callAt: Date;
  createdAt: Date;
  updatedAt: Date;
  opts: T['opts'];
};

export type CronTable = DbCron & { _name: 'Crons' };

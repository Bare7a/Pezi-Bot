import { UserRoleType } from './User';

export type RaffleCronType = {
  type: 'RAFFLE';
  opts: RaffleCronOptions;
};

export type RaffleCronOptions = {
  pot: number;
  userList: [number, number][];
  isBettingOpened: boolean;
};

export type RewardCronType = {
  type: 'REWARDS';
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

export type CronType<T extends ICron> = {
  id?: number;
  type: T['type'];
  interval: number;
  isEnabled: boolean;
  isExecuting: boolean;
  isLogEnabled: boolean;
  lastCalledAt: Date;
  callAt: Date;
  opts: T['opts'];
};

export const isRaffleCron = (cron: CronType<ICron>): cron is CronType<RaffleCronType> => cron.type === 'RAFFLE';
export const isRewardCron = (cron: CronType<ICron>): cron is CronType<RewardCronType> => cron.type === 'REWARDS';
export const isStatusCron = (cron: CronType<ICron>): cron is CronType<StatusCronType> => cron.type === 'STATUS';
export const isTriviaCron = (cron: CronType<ICron>): cron is CronType<TriviaCronType> => cron.type === 'TRIVIA';

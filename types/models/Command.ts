import { UserRoleType } from './User';

export const commandType = [
  'ADMIN',
  'CMD',
  'NOTE',
  'MESSAGE',
  'FLIP',
  'DICE',
  'RAFFLE',
  'SLOT',
  'STATS',
  'TRIVIA',
  'POINTS',
] as const;

export type CommandType = (typeof commandType)[number];

export type IAdminCommand = {
  type: 'ADMIN';
  opts: IAdminOptions;
};

export type IAdminOptions = {
  messages: {
    add: string;
    remove: string;
  };
};

export type ICmdCommand = {
  type: 'CMD';
  opts: ICmdOptions;
};

export type ICmdOptions = {
  messages: {
    enable: string;
    disable: string;
    userCd: string;
    globalCd: string;
  };
};

export type INoteCommand = {
  type: 'NOTE';
  opts: INoteOptions;
};

export type INoteOptions = {
  messages: {
    add: string;
    set: string;
    remove: string;
    enable: string;
    disable: string;
    userCd: string;
    globalCd: string;
  };
};

export type IMessageCommand = {
  type: 'MESSAGE';
  opts: IMessageOptions;
};

export type IMessageOptions = {
  message: string;
};

export type IFlipCommand = {
  type: 'FLIP';
  opts: IFlipOptions;
};

export type IFlipOptions = {
  multi: number;
  messages: {
    won: string;
    lost: string;
  };
};

export type IDiceCommand = {
  type: 'DICE';
  opts: IDiceOptions;
};

export type IDiceOptions = {
  multiS: number;
  multiM: number;
  multiL: number;
  multiJ: number;
  messages: {
    won: string;
    lost: string;
  };
};

export type IRaffleCommand = {
  type: 'RAFFLE';
  opts: IRaffleOptions;
};

export type IRaffleOptions = {
  betCountdown: number;
  startCountdown: number;
  minBet: number;
  maxBet: number;
  messages: {
    noBets: string;
    started: string;
    userWon: string;
    notOpened: string;
    userBetted: string;
    alreadyBetted: string;
    invalidAmount: string;
  };
  showMessages: {
    noBets: boolean;
    notOpened: boolean;
    userBetted: boolean;
    alreadyBetted: boolean;
    invalidAmount: boolean;
  };
};

export type ISlotCommand = {
  type: 'SLOT';
  opts: ISlotOptions;
};

export type ISlotOptions = {
  multiS: number;
  multiM: number;
  multiL: number;
  multiJ: number;
  emoteList: string[];
  superEmote: string;
  messages: {
    wonS: string;
    wonM: string;
    wonL: string;
    wonJ: string;
    lost: string;
  };
};

export type IStatsCommand = {
  type: 'STATS';
  opts: IStatsOptions;
};

export type IStatsOptions = {
  messages: {
    positive: string;
    negative: string;
  };
};

export type ITriviaCommand = {
  type: 'TRIVIA';
  opts: ITriviaOptions;
};

export type ITriviaOptions = {
  minReward: number;
  maxReward: number;
  minQuestionInterval: number;
  maxQuestionInterval: number;
  newQuestionOnAnswer: boolean;
  questions: [string, string[]][];
  messages: {
    won: string;
    lost: string;
    notReady: string;
    newQuestion: string;
    rightAnswer: string;
  };
  showMessages: {
    lost: boolean;
    notReady: boolean;
    rightAnswer: boolean;
  };
};

export type IPointsCommand = {
  type: 'POINTS';
  opts: IPointsOptions;
};

export type IPointsOptions = {
  pointsMessages: {
    message: string;
    minPoints: number;
  }[];
};

export type ICommand =
  | ICmdCommand
  | IAdminCommand
  | IFlipCommand
  | IDiceCommand
  | IRaffleCommand
  | ISlotCommand
  | IStatsCommand
  | ITriviaCommand
  | IPointsCommand
  | INoteCommand
  | IMessageCommand;

export type GenericCommand = {
  id: number;
  name: string;
  cost: number;
  customCost: boolean;
  userCd: number;
  globalCd: number;
  cdMessage: string;
  showCdMessage: boolean;
  isEnabled: boolean;
  onlyOnline: boolean;
  isLogEnabled: boolean;
};

export type DbCommand = GenericCommand & {
  type: string;
  permissions: string;
  lastCalledAt: string;
  opts: string;
  createdAt: string;
  updatedAt: string;
};

export type Command<T extends ICommand> = GenericCommand & {
  type: T['type'];
  permissions: UserRoleType[];
  lastCalledAt: Date;
  opts: T['opts'];
  createdAt: Date;
  updatedAt: Date;
};

export type CommandTable = DbCommand & { _name: 'Commands' };

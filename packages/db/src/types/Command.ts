import { UserRoleType } from '.';

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

export type CommandType<T extends ICommand> = {
  id?: number;
  type: T['type'];
  name: string;
  cost: number;
  customCost: boolean;
  userCd: number;
  globalCd: number;
  cdMessage: string;
  showCdMessage: boolean;
  isEnabled: boolean;
  onlyOnline: boolean;
  permission: UserRoleType[];
  lastCalledAt: Date;
  isLogEnabled: boolean;
  opts: T['opts'];
};

export const isAdminCommand = (command: CommandType<ICommand>): command is CommandType<IAdminCommand> =>
  command.type === 'ADMIN';

export const isCmdCommand = (command: CommandType<ICommand>): command is CommandType<ICmdCommand> =>
  command.type === 'CMD';

export const isNoteCommand = (command: CommandType<ICommand>): command is CommandType<INoteCommand> =>
  command.type === 'NOTE';

export const isMessageCommand = (command: CommandType<ICommand>): command is CommandType<IMessageCommand> =>
  command.type === 'MESSAGE';

export const isFlipCommand = (command: CommandType<ICommand>): command is CommandType<IFlipCommand> =>
  command.type === 'FLIP';

export const isDiceCommand = (command: CommandType<ICommand>): command is CommandType<IDiceCommand> =>
  command.type === 'DICE';

export const isRaffleCommand = (command: CommandType<ICommand>): command is CommandType<IRaffleCommand> =>
  command.type === 'RAFFLE';

export const isSlotCommand = (command: CommandType<ICommand>): command is CommandType<ISlotCommand> =>
  command.type === 'SLOT';

export const isStatsCommand = (command: CommandType<ICommand>): command is CommandType<IStatsCommand> =>
  command.type === 'STATS';

export const isTriviaCommand = (command: CommandType<ICommand>): command is CommandType<ITriviaCommand> =>
  command.type === 'TRIVIA';

export const isPointsCommand = (command: CommandType<ICommand>): command is CommandType<IPointsCommand> =>
  command.type === 'POINTS';

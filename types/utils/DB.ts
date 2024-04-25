import { TwitchActions, UserMessage } from './Twitch';
import { LogTable, Log } from '../models/Log';
import { UserTable, User, UserRoleType } from '../models/User';
import { CronTable, ICron, Cron, RaffleCronType, RewardCronType, StatusCronType, TriviaCronType } from '../models/Cron';
import {
  CommandTable,
  CommandType,
  commandType,
  ICommand,
  Command,
  IMessageCommand,
  IAdminCommand,
  ICmdCommand,
  INoteCommand,
  IFlipCommand,
  IDiceCommand,
  IRaffleCommand,
  ISlotCommand,
  IStatsCommand,
  ITriviaCommand,
  IPointsCommand,
} from '../models/Command';

export type SqliteType = string | number | boolean;

export type Table = UserTable | CommandTable | CronTable | LogTable;

export type TableColumns<T extends Table> = Omit<T, '_name'>;
export type TableColumnNames<T extends Table> = keyof TableColumns<T>;

export type QueryOptions<T extends Table> = {
  where?: {
    eq?: Partial<TableColumns<T>>;
    ne?: Partial<TableColumns<T>>;
    an?: { [K in TableColumnNames<T>]?: T[K][] };
    na?: { [K in TableColumnNames<T>]?: T[K][] };
  };
  order?: Partial<Record<TableColumnNames<T>, 'ASC' | 'DESC'>>;
  limit?: number;
};

export type NonNumberProps<T> = { [K in keyof T]: T[K] extends number ? never : K }[keyof T];
export type OmitNonNumbers<T> = Omit<T, NonNumberProps<T>>;

export interface DatabaseConnection {
  init(): void;
  delete<T extends Table>(table: T['_name'], options: QueryOptions<T>): T[];
  getOne<T extends Table>(table: T['_name'], options: Omit<QueryOptions<T>, 'limit'>): T | null;
  getMany<T extends Table>(table: T['_name'], options: QueryOptions<T>): T[];
  insertOne<T extends Table>(table: T['_name'], data: Omit<T, 'id' | '_name'>): T;
  insertMany<T extends Table>(table: T['_name'], data: Omit<T, 'id' | '_name'>[]): T[];
  updateOne<T extends Table>(table: T['_name'], data: Partial<TableColumns<T>>, where?: QueryOptions<T>['where']): T;
  updateMany<T extends Table>(table: T['_name'], data: Partial<TableColumns<T>>, where?: QueryOptions<T>['where']): T[];
  incrementOne<T extends Table>(
    table: T['_name'],
    data: Partial<OmitNonNumbers<TableColumns<T>>>,
    where?: QueryOptions<T>['where']
  ): T | null;
  incrementMany<T extends Table>(
    table: T['_name'],
    data: Partial<OmitNonNumbers<TableColumns<T>>>,
    where?: QueryOptions<T>['where']
  ): T[];
  decrementOne<T extends Table>(
    table: T['_name'],
    data: Partial<OmitNonNumbers<TableColumns<T>>>,
    where?: QueryOptions<T>['where']
  ): T | null;
  decrementMany<T extends Table>(
    table: T['_name'],
    data: Partial<OmitNonNumbers<TableColumns<T>>>,
    where?: QueryOptions<T>['where']
  ): T[];
  truncate<T extends Table>(table: T['_name']): void;
}

export interface DbActions {
  Log: LogActions;
  User: UserActions;
  Cron: CronActions;
  Command: CommandActions;
}

// Command
export const isCommandType = (type: string): type is CommandType => commandType.map((c) => c.toString()).includes(type);

export const toCommandType = (type: string): CommandType => {
  if (!isCommandType(type)) throw Error(`Invalid command type: ${type}`);
  return type;
};

export interface CommandActions {
  fetch<T extends ICommand>(type: T['type']): Command<T> | null;
  fetchByName<T extends ICommand>(name: string): Command<T> | null;
  update<T extends ICommand>(command: Command<T>): Command<T>;
  deleteById(id: number): void;
  canUserExecute(command: Command<ICommand>, user: User, db: DbActions, bot: TwitchActions): boolean;
  addCooldowns(command: Command<ICommand>, user: User, db: DbActions): void;
  createNewMessage(name: string, message: string): Command<IMessageCommand>;
  execute(command: Command<ICommand>, user: User, params: string[], db: DbActions, bot: TwitchActions): boolean;
  getCost(command: Command<ICommand>, customCost: string, user: User): number;
}

export const isAdminCommand = (command: Command<ICommand>): command is Command<IAdminCommand> =>
  command.type === 'ADMIN';

export const isCmdCommand = (command: Command<ICommand>): command is Command<ICmdCommand> => command.type === 'CMD';

export const isNoteCommand = (command: Command<ICommand>): command is Command<INoteCommand> => command.type === 'NOTE';

export const isMessageCommand = (command: Command<ICommand>): command is Command<IMessageCommand> =>
  command.type === 'MESSAGE';

export const isFlipCommand = (command: Command<ICommand>): command is Command<IFlipCommand> => command.type === 'FLIP';

export const isDiceCommand = (command: Command<ICommand>): command is Command<IDiceCommand> => command.type === 'DICE';

export const isRaffleCommand = (command: Command<ICommand>): command is Command<IRaffleCommand> =>
  command.type === 'RAFFLE';

export const isSlotCommand = (command: Command<ICommand>): command is Command<ISlotCommand> => command.type === 'SLOT';

export const isStatsCommand = (command: Command<ICommand>): command is Command<IStatsCommand> =>
  command.type === 'STATS';

export const isTriviaCommand = (command: Command<ICommand>): command is Command<ITriviaCommand> =>
  command.type === 'TRIVIA';

export const isPointsCommand = (command: Command<ICommand>): command is Command<IPointsCommand> =>
  command.type === 'POINTS';

export type CommandActionType<T extends ICommand> = {
  isValid(command: Command<ICommand>): command is Command<T>;
  execute(user: User, params: string[], command: Command<T>, db: DbActions, bot: TwitchActions): boolean;
  defaultConfig: Omit<Command<T>, 'id' | 'createdAt' | 'updatedAt'>;
};

// Cron
export interface CronActions {
  fetch<T extends ICron>(type: T['type']): Cron<T>;
  update<T extends ICron>(type: T['type'], cron: Cron<T>): Cron<T>;
  isExecutePermited<T extends ICron>(cron: Cron<T>): boolean;
  getCallAtDate<T extends ICron>(cron: Cron<T>, interval?: number): Date;
  resetExecution(): void;
}

export type CronActionType<T extends ICron> = {
  isValid(cron: Cron<ICron>): cron is Cron<T>;
  execute(db: DbActions, bot: TwitchActions): Promise<boolean>;
  defaultConfig: Omit<Cron<T>, 'id' | 'createdAt' | 'updatedAt'>;
};

export const isRaffleCron = (cron: Cron<ICron>): cron is Cron<RaffleCronType> => cron.type === 'RAFFLE';
export const isRewardCron = (cron: Cron<ICron>): cron is Cron<RewardCronType> => cron.type === 'REWARD';
export const isStatusCron = (cron: Cron<ICron>): cron is Cron<StatusCronType> => cron.type === 'STATUS';
export const isTriviaCron = (cron: Cron<ICron>): cron is Cron<TriviaCronType> => cron.type === 'TRIVIA';

// Log
export interface LogActions {
  reset(): void;
  insert(type: string, userId: string, cost: number, points: number, allPoints: number): Log;
  insertBulk(logs: Log[]): void;
  getUserBets(userId: string): Log[];
}

// User
export interface UserActions {
  sync(newUser: UserMessage): User;
  update(user: User): User;
  reset(): UserTable[];
  getRole(user: User): UserRoleType;
  getById(userId: string): User | null;
  getByIds(userIds: string[]): User[];
  getByUsername(username: string): User | null;
  getTopUsers(): User[];
  addAsChatter(user: User, Cron: CronActions): boolean;
  addPoints(user: User, cost: number, points: number, type: string, Log?: LogActions): boolean;
  setPoints(user: User, cost: number, points: number, type: string, Log?: LogActions): boolean;
  removePoints(user: User, cost: number, points: number, type: string, Log?: LogActions): boolean;
  addPointsInBulk(userIds: string[], cost: number, points: number): boolean;
}

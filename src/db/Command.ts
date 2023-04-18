import {
  Model,
  WhereAttributeHashValue,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from '@sequelize/core';
import { ICommand, CommandType, IMessageCommand, UserRoleType, StatusCronType } from '../types';
import { Cron, User } from '.';
import {
  AdminCommand,
  CmdCommand,
  DiceCommand,
  FlipCommand,
  PointsCommand,
  SlotCommand,
  NoteCommand,
  MessageCommand,
  StatsCommand,
} from '../commands';
import { TwitchClient } from '../utils';
import { TriviaCommand } from '../commands/Trivia';
import { RaffleCommand } from '../commands/Raffle';

type CommandAttributes = Command<ICommand>;
export class Command<T extends ICommand>
  extends Model<InferAttributes<CommandAttributes>, InferCreationAttributes<CommandAttributes>>
  implements CommandType<T>
{
  declare id: CreationOptional<number>;
  declare type: T['type'];
  declare name: string;
  declare cost: number;
  declare customCost: boolean;
  declare userCd: number;
  declare globalCd: number;
  declare cdMessage: string;
  declare showCdMessage: boolean;
  declare isEnabled: boolean;
  declare onlyOnline: boolean;
  declare lastCalledAt: Date;
  declare permission: UserRoleType[];
  declare isLogEnabled: boolean;
  declare opts: T['opts'];

  static async fetch<T extends ICommand>(type: WhereAttributeHashValue<T['type']>): Promise<Command<T>> {
    const command = await Command.findOne<Command<T>>({ where: { type } });
    if (!command) throw Error(`Command ${type} missing from the database!`);
    return command;
  }

  async canUserExecute(user: User, bot: TwitchClient): Promise<Boolean> {
    const command = this;
    const currentTime = new Date();

    const cronStatus = await Cron.fetch<StatusCronType>('STATUS');

    const userRoleType = user.getRoleType();
    const isStreamOnline = cronStatus.opts.isOnline;

    const userCd = command.userCd;
    const globalCd = command.globalCd;
    const userLastCallTimeStr = user.commands[command.type];

    const userLastCallTime = userLastCallTimeStr ? new Date(userLastCallTimeStr) : new Date(0);
    const globalLastCallTime = command.lastCalledAt ?? new Date(0);

    const userTime = (currentTime.getTime() - userLastCallTime.getTime()) / 1000;
    const globalTime = (currentTime.getTime() - globalLastCallTime.getTime()) / 1000;

    const isUserTimeAvailable = userTime >= userCd;
    const isGlobalTimeAvailable = globalTime >= globalCd;

    const isUserPermitted = command.permission.includes(userRoleType);
    const isCommandEnabled = command.isEnabled && ((isStreamOnline && command.onlyOnline) || !command.onlyOnline);
    const isCdTimeAvailable = isUserTimeAvailable && isGlobalTimeAvailable;

    if (isCommandEnabled && isUserPermitted && !isCdTimeAvailable && command.showCdMessage) {
      const cd = (userCd - userTime).toFixed(0);
      const message = command.cdMessage
        .replaceAll('$cd', cd)
        .replaceAll('$command', command.name)
        .replaceAll('$user', user.username);

      await bot.send(message);
    }

    const isCommandExecutable = isCommandEnabled && isUserPermitted && isCdTimeAvailable;
    return isCommandExecutable;
  }

  async execute(user: User, params: string[], bot: TwitchClient): Promise<Boolean> {
    if (AdminCommand.isValid(this)) return await AdminCommand.execute(user, params, this, bot);
    if (CmdCommand.isValid(this)) return await CmdCommand.execute(user, params, this, bot);
    if (DiceCommand.isValid(this)) return await DiceCommand.execute(user, params, this, bot);
    if (FlipCommand.isValid(this)) return await FlipCommand.execute(user, params, this, bot);
    if (MessageCommand.isValid(this)) return await MessageCommand.execute(user, params, this, bot);
    if (NoteCommand.isValid(this)) return await NoteCommand.execute(user, params, this, bot);
    if (PointsCommand.isValid(this)) return await PointsCommand.execute(user, params, this, bot);
    if (RaffleCommand.isValid(this)) return await RaffleCommand.execute(user, params, this, bot);
    if (SlotCommand.isValid(this)) return await SlotCommand.execute(user, params, this, bot);
    if (StatsCommand.isValid(this)) return await StatsCommand.execute(user, params, this, bot);
    if (TriviaCommand.isValid(this)) return await TriviaCommand.execute(user, params, this, bot);
    return false;
  }

  async addCooldowns(user: User): Promise<void> {
    const command = this;
    const currentTime = new Date();

    command.lastCalledAt = currentTime;
    user.commands[command.type] = currentTime.toISOString();
    user.changed('commands', true);

    await Promise.all([user.save(), command.save()]);
  }

  getCost(customCost: string, user: User): number {
    const command = this;
    if (!command.customCost) return command.cost;
    if (customCost === 'all') return user.points;
    if (Number(customCost)) return Math.abs(Math.floor(Number(customCost)));
    return command.cost;
  }

  static async createNewMessage(name: string, message: string): Promise<Command<IMessageCommand>> {
    const command = await Command.create<Command<IMessageCommand>>({
      name: name,
      type: 'MESSAGE',
      cost: 0,
      customCost: false,
      userCd: 0,
      globalCd: 0,
      cdMessage: '$user You can use $command after $cd seconds!',
      showCdMessage: true,
      isEnabled: true,
      onlyOnline: false,
      permission: ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'],
      lastCalledAt: new Date(0),
      isLogEnabled: false,
      opts: { message },
    });

    return command;
  }

  static async seed(): Promise<void> {
    const commands = [
      AdminCommand.defaultConfig,
      CmdCommand.defaultConfig,
      DiceCommand.defaultConfig,
      FlipCommand.defaultConfig,
      MessageCommand.defaultConfig,
      NoteCommand.defaultConfig,
      PointsCommand.defaultConfig,
      RaffleCommand.defaultConfig,
      SlotCommand.defaultConfig,
      StatsCommand.defaultConfig,
      TriviaCommand.defaultConfig,
    ];

    await Command.bulkCreate(commands);
  }
}

import { AdminCommand } from '../commands/Admin';
import { CmdCommand } from '../commands/Cmd';
import { DiceCommand } from '../commands/Dice';
import { FlipCommand } from '../commands/Flip';
import { MessageCommand } from '../commands/Message';
import { NoteCommand } from '../commands/Note';
import { PointsCommand } from '../commands/Points';
import { RaffleCommand } from '../commands/Raffle';
import { SlotCommand } from '../commands/Slot';
import { StatsCommand } from '../commands/Stats';
import { TriviaCommand } from '../commands/Trivia';
import { StatusCronType } from '../types/models/Cron';
import { UserRoleType, User } from '../types/models/User';
import { TwitchActions } from '../types/utils/Twitch';
import { CommandActions, DatabaseConnection, toCommandType, DbActions } from '../types/utils/DB';
import { ICommand, CommandTable, Command, DbCommand, IMessageCommand } from '../types/models/Command';

export class CommandEntity implements CommandActions {
  constructor(private dbConn: DatabaseConnection) {}

  private parse = <T extends ICommand>(command: CommandTable): Command<T> => ({
    ...command,
    type: toCommandType(command.type),
    permissions: <UserRoleType[]>JSON.parse(command.permissions),
    lastCalledAt: new Date(command.lastCalledAt),
    createdAt: new Date(command.createdAt),
    updatedAt: new Date(command.updatedAt),
    opts: <Command<T>['opts']>JSON.parse(command.opts),
  });

  private parseToDb = <T extends ICommand>(command: Command<T>): Omit<DbCommand, 'id'> => {
    const { id, ...commandDb } = command;
    return {
      ...commandDb,
      permissions: JSON.stringify(command.permissions),
      lastCalledAt: command.lastCalledAt.toISOString(),
      createdAt: command.createdAt.toISOString(),
      updatedAt: command.updatedAt.toISOString(),
      opts: JSON.stringify(command.opts),
    };
  };

  public fetch<T extends ICommand>(type: T['type']): Command<T> | null {
    const commandDb = this.dbConn.getOne<CommandTable>('Commands', { where: { eq: { type } } });
    if (!commandDb) return null;

    const command = this.parse(commandDb);
    return command;
  }

  public fetchByName<T extends ICommand>(name: string): Command<T> | null {
    const commandDb = this.dbConn.getOne<CommandTable>('Commands', { where: { eq: { name } } });
    if (!commandDb) return null;

    const command = this.parse(commandDb);
    return command;
  }

  public deleteById(id: number): void {
    this.dbConn.delete<CommandTable>('Commands', { where: { eq: { id } } });
  }

  public update = <T extends ICommand>(command: Command<T>): Command<T> => {
    const updatedCommand = this.dbConn.updateOne<CommandTable>('Commands', this.parseToDb(command), {
      eq: { id: command.id },
    });
    return this.parse(updatedCommand);
  };

  public canUserExecute(command: Command<ICommand>, user: User, db: DbActions, bot: TwitchActions): boolean {
    const currentTime = new Date();
    const cronStatus = db.Cron.fetch<StatusCronType>('STATUS');

    const userRoleType = db.User.getRole(user);
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

    const isUserPermitted = command.permissions.includes(userRoleType);
    const isCommandEnabled = command.isEnabled && ((isStreamOnline && command.onlyOnline) || !command.onlyOnline);
    const isCdTimeAvailable = isUserTimeAvailable && isGlobalTimeAvailable;

    if (isCommandEnabled && isUserPermitted && !isCdTimeAvailable && command.showCdMessage) {
      const cd = (userCd - userTime).toFixed(0);
      const message = command.cdMessage
        .replaceAll('$cd', cd)
        .replaceAll('$command', command.name)
        .replaceAll('$user', user.username);

      bot.send(message);
    }

    const isCommandExecutable = isCommandEnabled && isUserPermitted && isCdTimeAvailable;
    return isCommandExecutable;
  }

  public addCooldowns(command: Command<ICommand>, user: User, db: DbActions): void {
    const currentTime = new Date();

    command.lastCalledAt = currentTime;
    user.commands[command.type] = currentTime;

    db.User.update(user);
    db.Command.update(command);
  }

  public getCost(command: Command<ICommand>, customCost: string, user: User): number {
    if (!command.customCost) return command.cost;
    if (customCost === 'all') return user.points;
    if (Number(customCost)) return Math.abs(Math.floor(Number(customCost)));
    return command.cost;
  }

  public createNewMessage(name: string, message: string): Command<IMessageCommand> {
    const dateNow = new Date();
    const command = this.dbConn.insertOne<CommandTable>('Commands', {
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
      permissions: JSON.stringify(['streamer', 'admin', 'mod', 'sub', 'vip', 'member']),
      lastCalledAt: new Date(0).toISOString(),
      isLogEnabled: false,
      opts: JSON.stringify({ message }),
      createdAt: dateNow.toISOString(),
      updatedAt: dateNow.toISOString(),
    });

    return this.parse(command);
  }

  public execute(command: Command<ICommand>, user: User, params: string[], db: DbActions, bot: TwitchActions): boolean {
    if (AdminCommand.isValid(command)) return AdminCommand.execute(user, params, command, db, bot);
    if (CmdCommand.isValid(command)) return CmdCommand.execute(user, params, command, db, bot);
    if (DiceCommand.isValid(command)) return DiceCommand.execute(user, params, command, db, bot);
    if (FlipCommand.isValid(command)) return FlipCommand.execute(user, params, command, db, bot);
    if (MessageCommand.isValid(command)) return MessageCommand.execute(user, params, command, db, bot);
    if (NoteCommand.isValid(command)) return NoteCommand.execute(user, params, command, db, bot);
    if (PointsCommand.isValid(command)) return PointsCommand.execute(user, params, command, db, bot);
    if (RaffleCommand.isValid(command)) return RaffleCommand.execute(user, params, command, db, bot);
    if (SlotCommand.isValid(command)) return SlotCommand.execute(user, params, command, db, bot);
    if (StatsCommand.isValid(command)) return StatsCommand.execute(user, params, command, db, bot);
    if (TriviaCommand.isValid(command)) return TriviaCommand.execute(user, params, command, db, bot);
    return false;
  }
}

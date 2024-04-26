import Database from 'bun:sqlite';
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
import { RaffleCron } from '../crons/Raffle';
import { RewardCron } from '../crons/Reward';
import { StatusCron } from '../crons/Status';
import { TriviaCron } from '../crons/Trivia';
import { CommandEntity } from '../models/Command';
import { CronEntity } from '../models/Cron';
import { LogEntity } from '../models/Log';
import { UserEntity } from '../models/User';
import { Command, ICommand, CommandTable } from '../types/models/Command';
import { Cron, ICron, CronTable } from '../types/models/Cron';
import {
  Table,
  QueryOptions,
  TableColumns,
  TableColumnNames,
  DatabaseConnection,
  SqliteColumn,
  OmitNonNumbers,
} from '../types/utils/DB';

const isOneValid = <T>(row: any): row is T => typeof row === 'object' && typeof row.id === 'number';

const isAllValid = <T>(rows: any[]): rows is T[] => Array.isArray(rows) && rows.every((row) => isOneValid(row));

const getWhereClause = <T extends Table>(where?: QueryOptions<T>['where']) => {
  const eq: Partial<TableColumns<T>> = where?.eq ?? {};
  const ne: Partial<TableColumns<T>> = where?.ne ?? {};
  const an: { [K in TableColumnNames<T>]?: T[K][] } = where?.an ?? {};
  const na: { [K in TableColumnNames<T>]?: T[K][] } = where?.na ?? {};

  const eqEnt = Object.entries(eq);
  const neEnt = Object.entries(ne);
  const anEnt = Object.entries(an);
  const naEnt = Object.entries(na);

  if (eqEnt.length + neEnt.length + anEnt.length + naEnt.length === 0) return { whereValues: [], whereString: '' };

  const whereText = [
    ...eqEnt.map(([key]) => `${key} = ?`),
    ...neEnt.map(([key]) => `${key} <> ?`),
    ...anEnt.map(([key, value]) => `${key} IN (${Array(value.length).fill('?').join(',')})`),
    ...naEnt.map(([key, value]) => `${key} NOT IN (${Array(value.length).fill('?').join(',')})`),
  ].join(' AND ');

  const whereString = `WHERE ${whereText}`;
  const whereValues: SqliteColumn[] = [
    ...Object.values(eq),
    ...Object.values(ne),
    ...Object.values(an).flatMap((value) => value),
    ...Object.values(na).flatMap((value) => value),
  ];

  return { whereValues, whereString };
};

const getOrderClause = <T extends Table>(order?: QueryOptions<T>['order']) => {
  if (!order || Object.keys(order).length === 0) return { orderStr: '' };

  const orderText = Object.entries(order)
    .map(([key, value]) => `${key} ${value}`)
    .join(',');
  const orderStr = `ORDER BY ${orderText}`;

  return { orderStr };
};

const getSetClause = <T extends TableColumns<Table>>(data: Partial<T>) => {
  const setText = Object.keys(data)
    .map((key) => `${key} = ?`)
    .join(',');

  const setString = `SET ${setText}`;
  const setValues: SqliteColumn[] = Object.values(data);

  return { setValues, setString };
};

const getCustomSetClause = <T extends TableColumns<Table>>(data: Partial<T>, operation: string) => {
  const setText = Object.keys(data)
    .map((key) => `${key} = ${key} ${operation} ?`)
    .join(',');

  const setString = `SET ${setText}`;
  const setValues: SqliteColumn[] = Object.values(data);

  return { setValues, setString };
};

export class Db {
  public Log;
  public Cron;
  public User;
  public Command;

  constructor(private db: DatabaseConnection) {
    this.db.init();
    this.Log = new LogEntity(this.db);
    this.Cron = new CronEntity(this.db);
    this.User = new UserEntity(this.db);
    this.Command = new CommandEntity(this.db);
  }
}

const initSql = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  userId TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  points INTEGER NOT NULL,
  color TEXT NOT NULL,
  isSub BOOLEAN NOT NULL,
  isVip BOOLEAN NOT NULL,
  isMod BOOLEAN NOT NULL,
  isAdmin BOOLEAN NOT NULL,
  isStreamer BOOLEAN NOT NULL,
  commands JSON NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  isEnabled BOOLEAN NOT NULL,
  isLogEnabled BOOLEAN NOT NULL,
  lastCalledAt TIMESTAMP NOT NULL,
  opts TEXT NOT NULL,
  cost INTEGER NOT NULL,
  customCost BOOLEAN NOT NULL,
  userCd INTEGER NOT NULL,
  globalCd INTEGER NOT NULL,
  cdMessage TEXT NOT NULL,
  showCdMessage BOOLEAN NOT NULL,
  onlyOnline BOOLEAN NOT NULL,
  permissions TEXT [] NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS crons (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  type TEXT NOT NULL,
  interval INTEGER NOT NULL,
  isEnabled BOOLEAN NOT NULL,
  isExecuting BOOLEAN NOT NULL,
  isLogEnabled BOOLEAN NOT NULL,
  lastCalledAt TIMESTAMP NOT NULL,
  callAt TIMESTAMP NOT NULL,
  opts TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  type TEXT NOT NULL,
  userId TEXT NOT NULL,
  cost INTEGER NOT NULL,
  points INTEGER NOT NULL,
  allPoints INTEGER NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
`;

export class SqliteConnection extends Database implements DatabaseConnection {
  private parseCommand = (
    dateNow: string,
    command: Omit<Command<ICommand>, 'id' | 'createdAt' | 'updatedAt'>
  ): Omit<CommandTable, 'id' | '_name'> => ({
    ...command,
    opts: JSON.stringify(command.opts),
    createdAt: dateNow,
    updatedAt: dateNow,
    lastCalledAt: command.lastCalledAt.toISOString(),
    permissions: JSON.stringify(command.permissions),
  });

  private parseCron = (
    dateNow: string,
    cron: Omit<Cron<ICron>, 'id' | 'createdAt' | 'updatedAt'>
  ): Omit<CronTable, 'id' | '_name'> => ({
    ...cron,
    opts: JSON.stringify(cron.opts),
    createdAt: dateNow,
    updatedAt: dateNow,
    callAt: cron.callAt.toISOString(),
    lastCalledAt: cron.lastCalledAt.toISOString(),
  });

  public init(): void {
    this.exec(initSql);
    const dateNow = new Date().toISOString();

    const { cmdCount } = <{ cmdCount: number }>this.query('SELECT COUNT(*) AS "cmdCount" FROM Commands').get();
    if (cmdCount === 0) {
      this.insertMany<CommandTable>('Commands', [
        this.parseCommand(dateNow, AdminCommand.defaultConfig),
        this.parseCommand(dateNow, CmdCommand.defaultConfig),
        this.parseCommand(dateNow, DiceCommand.defaultConfig),
        this.parseCommand(dateNow, FlipCommand.defaultConfig),
        this.parseCommand(dateNow, MessageCommand.defaultConfig),
        this.parseCommand(dateNow, NoteCommand.defaultConfig),
        this.parseCommand(dateNow, PointsCommand.defaultConfig),
        this.parseCommand(dateNow, RaffleCommand.defaultConfig),
        this.parseCommand(dateNow, SlotCommand.defaultConfig),
        this.parseCommand(dateNow, StatsCommand.defaultConfig),
        this.parseCommand(dateNow, TriviaCommand.defaultConfig),
      ]);
    }

    const { crnCount } = <{ crnCount: number }>this.query('SELECT COUNT(*) AS "crnCount" FROM Crons').get();
    if (crnCount === 0) {
      this.insertMany<CronTable>('Crons', [
        this.parseCron(dateNow, RaffleCron.defaultConfig),
        this.parseCron(dateNow, RewardCron.defaultConfig),
        this.parseCron(dateNow, StatusCron.defaultConfig),
        this.parseCron(dateNow, TriviaCron.defaultConfig),
      ]);
    }
  }

  public delete<T extends Table>(table: T['_name'], options: QueryOptions<T>): T[] {
    const queryArr = [`DELETE FROM ${table}`];

    const { whereValues, whereString } = getWhereClause(options.where);
    if (whereString) queryArr.push(whereString);

    const queryStr = queryArr.join(' ');
    const rows = this.query(queryStr).all(...whereValues) ?? [];

    if (isAllValid<T>(rows)) return rows;
    throw Error(`There was a problem while deleting ${table}`);
  }

  public getMany<T extends Table>(table: T['_name'], options: QueryOptions<T>): T[] {
    const queryArr = [`SELECT * FROM ${table}`];

    const { whereValues, whereString } = getWhereClause(options.where);
    if (whereString) queryArr.push(whereString);

    const { orderStr } = getOrderClause(options.order);
    if (orderStr) queryArr.push(orderStr);

    const queryStr = queryArr.join(' ');
    const rows = this.query(queryStr).all(...whereValues) ?? [];

    if (isAllValid<T>(rows)) return rows;
    throw Error(`There was a problem while getting all ${table}`);
  }

  public getOne<T extends Table>(table: T['_name'], options: Omit<QueryOptions<T>, 'limit'>): T | null {
    const rows = this.getMany<T>(table, { ...options, limit: 1 });
    return rows[0] || null;
  }

  public insertMany<T extends Table>(table: T['_name'], data: Omit<T, 'id' | '_name'>[]): T[] {
    if (data.length === 0) return [];

    const keys: string[] = Object.keys(data[0]);
    const queryArr = [`INSERT INTO ${table} (${keys.join(',')}) VALUES`];

    const values = [];
    const valuesArr = [];
    for (const row of data) {
      const currentValues: SqliteColumn[] = Object.values(row);
      values.push(...currentValues);

      const placeholders = `${keys.map(() => '?').join(',')}`;
      valuesArr.push(`(${placeholders})`);
    }

    queryArr.push(valuesArr.join(','));
    queryArr.push('RETURNING *');

    const queryStr = queryArr.join(' ');
    const rows = this.query(queryStr).all(...values) ?? [];

    if (isAllValid<T>(rows)) return rows;
    throw Error(`There was a problem while inserting ${table}`);
  }

  public insertOne<T extends Table>(table: T['_name'], data: Omit<T, 'id' | '_name'>): T {
    const row = this.insertMany(table, [data])[0];
    if (isOneValid<T>(row)) return row;
    throw Error(`There was a problem while inserting one ${table}`);
  }

  public updateMany<T extends Table>(
    table: T['_name'],
    data: Partial<TableColumns<T>>,
    where?: QueryOptions<T>['where']
  ): T[] {
    const { setValues, setString } = getSetClause(data);
    if (setValues.length === 0) return [];

    const queryArr = [`UPDATE ${table}`];
    queryArr.push(setString);

    const { whereValues, whereString } = getWhereClause(where);

    if (whereString) queryArr.push(whereString);
    if (whereString) queryArr.push('RETURNING *');

    const queryStr = queryArr.join(' ');
    const rows = this.query(queryStr).all(...setValues, ...whereValues) ?? [];

    if (isAllValid<T>(rows)) return rows;
    throw Error(`There was a problem while updating ${table}`);
  }

  public updateOne<T extends Table>(
    table: T['_name'],
    data: Partial<TableColumns<T>>,
    where?: QueryOptions<T>['where']
  ): T {
    const row = this.updateMany(table, data, where)[0];
    if (isOneValid<T>(row)) return row;
    throw Error(`There was a problem while updating one ${table}`);
  }

  public incrementMany<T extends Table>(
    table: T['_name'],
    data: Partial<OmitNonNumbers<TableColumns<T>>>,
    where?: QueryOptions<T>['where']
  ): T[] {
    const { setValues, setString } = getCustomSetClause(data, '+');
    if (setValues.length === 0) return [];

    const queryArr = [`UPDATE ${table}`];
    queryArr.push(setString);

    const { whereValues, whereString } = getWhereClause(where);
    if (whereString) queryArr.push(whereString);
    if (whereString) queryArr.push('RETURNING *');

    const queryStr = queryArr.join(' ');
    const rows = this.query(queryStr).all(...setValues, ...whereValues) ?? [];

    if (isAllValid<T>(rows)) return rows;
    throw Error(`There was a problem while incrementing ${table}`);
  }

  public incrementOne<T extends Table>(
    table: T['_name'],
    data: Partial<OmitNonNumbers<TableColumns<T>>>,
    where?: QueryOptions<T>['where']
  ): T | null {
    const row = this.incrementMany(table, data, where)[0];
    if (isOneValid<T>(row)) return row || null;
    throw Error(`There was a problem while incrementing one ${table}`);
  }

  public decrementMany<T extends Table>(
    table: T['_name'],
    data: Partial<OmitNonNumbers<TableColumns<T>>>,
    where?: QueryOptions<T>['where']
  ): T[] {
    const { setValues, setString } = getCustomSetClause(data, '-');
    if (setValues.length === 0) return [];

    const queryArr = [`UPDATE ${table}`];
    queryArr.push(setString);

    const { whereValues, whereString } = getWhereClause(where);
    if (whereString) queryArr.push(whereString);
    if (whereString) queryArr.push('RETURNING *');

    const queryStr = queryArr.join(' ');
    const rows = this.query(queryStr).all(...setValues, ...whereValues) ?? [];

    if (isAllValid<T>(rows)) return rows;
    throw Error(`There was a problem while decrementing ${table}`);
  }

  public decrementOne<T extends Table>(
    table: T['_name'],
    data: Partial<OmitNonNumbers<TableColumns<T>>>,
    where?: QueryOptions<T>['where']
  ): T | null {
    const row = this.decrementMany(table, data, where)[0];
    if (isOneValid<T>(row)) return row || null;
    throw Error(`There was a problem while decrementing one ${table}`);
  }

  public truncate<T extends Table>(table: T['_name']) {
    this.exec(`DELETE FROM ${table}; UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='${table}';`);
  }
}

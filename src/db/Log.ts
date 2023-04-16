import { Optional } from 'sequelize/types';
import { Table, Model, DataType, Column } from 'sequelize-typescript';
import { LogType } from '../types';

type CronCreationAttributes = Optional<LogType, 'id'>;

@Table
export class Log extends Model<LogType, CronCreationAttributes> implements LogType {
  @Column(DataType.TEXT)
  declare userId: string;

  @Column(DataType.TEXT)
  declare type: string;

  @Column(DataType.NUMBER)
  declare cost: number;

  @Column(DataType.NUMBER)
  declare points: number;

  @Column(DataType.NUMBER)
  declare allPoints: number;

  static async reset() {
    const promises = [];

    promises.push(Log.truncate({ restartIdentity: true }));
    if (Log.sequelize?.getDialect() === 'sqlite') {
      promises.push(Log.sequelize.query("UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME='Logs'"));
    }

    await Promise.all(promises);
    return true;
  }
}

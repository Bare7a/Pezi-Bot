import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from '@sequelize/core';
import { LogType } from '../types';

type LogAttributes = Log;
export class Log
  extends Model<InferAttributes<LogAttributes>, InferCreationAttributes<LogAttributes>>
  implements LogType
{
  declare id: CreationOptional<number>;
  declare userId: string;
  declare type: string;
  declare cost: number;
  declare points: number;
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

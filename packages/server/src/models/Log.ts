import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  ModelAttributes,
} from '@sequelize/core';
import { PartialBy } from '@sequelize/core/types/utils/types';
import { LogType } from '@pezi-bot/shared';

import { SEQUELIZE_LOG_CONFIG } from '../utils/Config';

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

  static defaultAttributes: ModelAttributes<Log, PartialBy<InferAttributes<Log, { omit: never }>, never>> = {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    type: { type: DataTypes.TEXT, allowNull: false },
    userId: { type: DataTypes.TEXT, allowNull: false },
    points: { type: DataTypes.INTEGER, allowNull: false },
    cost: { type: DataTypes.INTEGER, allowNull: false },
    allPoints: { type: DataTypes.INTEGER, allowNull: false },
  };
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

Log.init(Log.defaultAttributes, { sequelize: SEQUELIZE_LOG_CONFIG });

import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  ModelAttributes,
} from '@sequelize/core';
import { LogType } from '../types';
import { PartialBy } from '@sequelize/core/types/utils/types';

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
}

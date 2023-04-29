import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  ModelAttributes,
  WhereAttributeHashValue,
} from '@sequelize/core';
import { ICron } from '../types';
import { PartialBy } from '@sequelize/core/types/utils/types';

type CronAttributes = Cron<ICron>;

export class Cron<T extends ICron>
  extends Model<InferAttributes<CronAttributes>, InferCreationAttributes<CronAttributes>>
  implements Cron<T>
{
  declare id: CreationOptional<number>;
  declare type: T['type'];
  declare interval: number;
  declare isEnabled: boolean;
  declare isExecuting: boolean;
  declare isLogEnabled: boolean;
  declare lastCalledAt: Date;
  declare callAt: Date;
  declare opts: T['opts'];

  static defaultAttributes: ModelAttributes<
    Cron<ICron>,
    PartialBy<InferAttributes<Cron<ICron>, { omit: never }>, never>
  > = {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    type: { type: DataTypes.TEXT, allowNull: false },
    interval: { type: DataTypes.INTEGER, allowNull: false },
    isEnabled: { type: DataTypes.BOOLEAN, allowNull: false },
    isExecuting: { type: DataTypes.BOOLEAN, allowNull: false },
    isLogEnabled: { type: DataTypes.BOOLEAN, allowNull: false },
    lastCalledAt: { type: DataTypes.DATE, allowNull: false },
    callAt: { type: DataTypes.DATE, allowNull: false },
    opts: { type: DataTypes.JSON, allowNull: false },
  };

  static async fetch<T extends ICron>(type: WhereAttributeHashValue<T['type']>): Promise<Cron<T>> {
    const cron = await Cron.findOne<Cron<T>>({ where: { type } });
    if (!cron) throw Error(`Cron ${type} missing from the database!`);
    return cron;
  }
}

import {
  Model,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  ModelAttributes,
  DataTypes,
} from '@sequelize/core';
import { PartialBy } from '@sequelize/core/types/utils/types';

import { CommandType, ICommand } from '../types/Command';
import { UserRoleType } from '../types/User';

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

  static defaultAttributes: ModelAttributes<
    Command<ICommand>,
    PartialBy<InferAttributes<Command<ICommand>, { omit: never }>, never>
  > = {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.TEXT, allowNull: false },
    isEnabled: { type: DataTypes.BOOLEAN, allowNull: false },
    isLogEnabled: { type: DataTypes.BOOLEAN, allowNull: false },
    lastCalledAt: { type: DataTypes.DATE, allowNull: false },
    opts: { type: DataTypes.JSON, allowNull: false },
    cost: { type: DataTypes.INTEGER, allowNull: false },
    customCost: { type: DataTypes.BOOLEAN, allowNull: false },
    userCd: { type: DataTypes.INTEGER, allowNull: false },
    globalCd: { type: DataTypes.INTEGER, allowNull: false },
    cdMessage: { type: DataTypes.TEXT, allowNull: false },
    showCdMessage: { type: DataTypes.BOOLEAN, allowNull: false },
    onlyOnline: { type: DataTypes.BOOLEAN, allowNull: false },
    permission: { type: DataTypes.JSON, allowNull: false },
  };
}

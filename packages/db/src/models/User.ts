import { PartialBy } from '@sequelize/core/types/utils/types';
import {
  Model,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  ModelAttributes,
} from '@sequelize/core';

import { UserType } from '../types/User';

type UserAttributes = User;
export class User
  extends Model<InferAttributes<UserAttributes>, InferCreationAttributes<UserAttributes>>
  implements UserType
{
  declare id: CreationOptional<number>;
  declare userId: string;
  declare username: string;
  declare points: number;
  declare color?: string;
  declare isSub: boolean;
  declare isVIP: boolean;
  declare isMod: boolean;
  declare isAdmin: boolean;
  declare isStreamer: boolean;
  declare commands: { [key: string]: string };

  static defaultAttributes: ModelAttributes<User, PartialBy<InferAttributes<User, { omit: never }>, never>> = {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.TEXT, allowNull: false },
    username: { type: DataTypes.TEXT, allowNull: false },
    points: { type: DataTypes.INTEGER, allowNull: false },
    color: { type: DataTypes.TEXT, allowNull: true },
    isSub: { type: DataTypes.BOOLEAN, allowNull: false },
    isVIP: { type: DataTypes.BOOLEAN, allowNull: false },
    isMod: { type: DataTypes.BOOLEAN, allowNull: false },
    isAdmin: { type: DataTypes.BOOLEAN, allowNull: false },
    isStreamer: { type: DataTypes.BOOLEAN, allowNull: false },
    commands: { type: DataTypes.JSON, allowNull: false },
  };
}

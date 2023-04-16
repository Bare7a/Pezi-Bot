import { Optional, WhereAttributeHashValue } from 'sequelize/types';
import { Table, Model, DataType, Column } from 'sequelize-typescript';
import { CronType, ICron } from '../types';

type CronCreationAttributes = Optional<CronType<ICron>, 'id'>;

@Table
export class Cron<T extends ICron> extends Model<CronType<T>, CronCreationAttributes> implements Cron<T> {
  @Column(DataType.TEXT)
  declare type: T['type'];

  @Column(DataType.NUMBER)
  declare interval: number;

  @Column(DataType.BOOLEAN)
  declare isEnabled: boolean;

  @Column(DataType.BOOLEAN)
  declare isExecuting: boolean;

  @Column(DataType.BOOLEAN)
  declare isLogEnabled: boolean;

  @Column(DataType.DATE)
  declare lastCalledAt: Date;

  @Column(DataType.DATE)
  declare callAt: Date;

  @Column(DataType.JSON)
  declare opts: T['opts'];

  isExecutePermited(): Boolean {
    const { callAt, isEnabled, isExecuting } = this;

    const currentTime = new Date();
    const isCronTimeAvailable = currentTime > callAt;

    const isExecutionTime = isEnabled && !isExecuting && isCronTimeAvailable;
    return isExecutionTime;
  }

  getCallAtDate(interval?: number): Date {
    return new Date(new Date().getTime() + (interval ?? this.interval) * 1000);
  }

  static async fetch<T extends ICron>(type: WhereAttributeHashValue<T['type']>): Promise<Cron<T>> {
    const cron = await Cron.findOne<Cron<T>>({ where: { type } });
    if (!cron) throw Error(`Cron ${type} missing from the database!`);
    return cron;
  }

  static async resetExecution() {
    await Cron.update({ isExecuting: false }, { where: { isExecuting: true } });
  }

  static async seed() {
    const crons: CronType<ICron>[] = [
      {
        type: 'STATUS',
        interval: 60,
        isEnabled: true,
        isExecuting: false,
        isLogEnabled: true,
        lastCalledAt: new Date(0),
        callAt: new Date(0),
        opts: {
          isOnline: false,
        },
      },
      {
        type: 'REWARDS',
        interval: 300,
        isEnabled: true,
        isExecuting: false,
        isLogEnabled: true,
        lastCalledAt: new Date(0),
        callAt: new Date(0),
        opts: {
          chatters: {},
          view: {
            streamer: 6,
            admin: 6,
            mod: 6,
            vip: 6,
            sub: 10,
            member: 5,
          },
          chat: {
            streamer: 2,
            admin: 2,
            mod: 2,
            vip: 2,
            sub: 2,
            member: 2,
          },
        },
      },
      {
        type: 'TRIVIA',
        interval: 0,
        isEnabled: true,
        isExecuting: false,
        isLogEnabled: true,
        lastCalledAt: new Date(0),
        callAt: new Date(0),
        opts: {
          previousQuestions: {},
        },
      },
      {
        type: 'RAFFLE',
        interval: 0,
        isEnabled: true,
        isExecuting: false,
        isLogEnabled: true,
        lastCalledAt: new Date(0),
        callAt: new Date(0),
        opts: {
          pot: 0,
          userList: [],
          isBettingOpened: false,
        },
      },
    ];

    Cron.bulkCreate(crons);
  }
}

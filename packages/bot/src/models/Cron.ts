import { WhereAttributeHashValue } from '@sequelize/core';
import { Cron as DBCron, ICron } from '@pezi-bot/db';

import { SEQUELIZE_DB_CONFIG } from '../utils/Config';

export class Cron<T extends ICron> extends DBCron<T> {
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
}

Cron.init(Cron.defaultAttributes, { sequelize: SEQUELIZE_DB_CONFIG });

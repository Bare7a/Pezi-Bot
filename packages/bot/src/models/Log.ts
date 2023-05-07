import { Log as DBLog } from '@pezi-bot/db';
import { SEQUELIZE_LOG_CONFIG } from '../utils/Config';

export class Log extends DBLog {
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

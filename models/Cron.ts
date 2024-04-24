import { CronActions, DatabaseConnection } from '../types/utils';
import { ICron, CronType, Cron, DbCron, CronTable } from '../types/models';

export class CronEntity implements CronActions {
  constructor(private dbConn: DatabaseConnection) {}

  private parse = <T extends ICron>(cronDb: CronTable, type: CronType): Cron<T> => ({
    ...cronDb,
    type,
    lastCalledAt: new Date(cronDb.lastCalledAt),
    callAt: new Date(cronDb.callAt),
    createdAt: new Date(cronDb.createdAt),
    updatedAt: new Date(cronDb.updatedAt),
    opts: <T['opts']>JSON.parse(cronDb.opts),
  });

  private parseToDb = <T extends ICron>(cron: Cron<T>): Omit<DbCron, 'id'> => {
    const { id, ...cronDb } = cron;
    return {
      ...cronDb,
      type: cron.type.toString(),
      lastCalledAt: cron.lastCalledAt.toISOString(),
      callAt: cron.callAt.toISOString(),
      createdAt: cron.createdAt.toISOString(),
      updatedAt: cron.createdAt.toISOString(),
      opts: JSON.stringify(cron.opts),
    };
  };

  public fetch<T extends ICron>(type: T['type']): Cron<T> {
    const cronDb = this.dbConn.getOne<CronTable>('Crons', { where: { eq: { type } } });
    if (!cronDb) throw Error(`Cron with type: ${type}, doesn't exist!`);

    const cron = this.parse<T>(cronDb, type);
    return cron;
  }

  public update<T extends ICron>(type: T['type'], cron: Cron<T>): Cron<T> {
    const cronDb = this.dbConn.updateOne<CronTable>('Crons', this.parseToDb(cron), { eq: { type } });
    if (!cronDb) throw Error(`Cron with type: ${type}, doesn't exist!`);

    const updatedCron = this.parse<T>(cronDb, type);
    return updatedCron;
  }

  public isExecutePermited<T extends ICron>(cron: Cron<T>): boolean {
    const { callAt, isEnabled, isExecuting } = cron;

    const currentTime = new Date();
    const isCronTimeAvailable = currentTime > callAt;

    const isExecutionTime = isEnabled && !isExecuting && isCronTimeAvailable;
    return isExecutionTime;
  }

  public getCallAtDate<T extends ICron>(cron: Cron<T>, interval?: number): Date {
    return new Date(new Date().getTime() + (interval ?? cron.interval) * 1000);
  }

  public resetExecution(): void {
    this.dbConn.updateMany<CronTable>('Crons', { isExecuting: false }, { eq: { isExecuting: true } });
  }
}

import { Log, DbLog, LogTable } from '../types/models';
import { DatabaseConnection, LogActions } from '../types/utils';

export class LogEntity implements LogActions {
  constructor(private dbConn: DatabaseConnection) {}
  private parse(log: LogTable): Log {
    return { ...log, createdAt: new Date(log.createdAt), updatedAt: new Date(log.updatedAt) };
  }

  private parseDb(log: Log): Omit<DbLog, 'id'> {
    const { id, ...logDb } = log;
    return { ...logDb, createdAt: log.createdAt.toISOString(), updatedAt: log.updatedAt.toISOString() };
  }

  public insert(type: string, userId: string, cost: number, points: number, allPoints: number): Log {
    const dateNow = new Date();
    const logDb = this.dbConn.insertOne<LogTable>('Logs', {
      type,
      userId,
      cost,
      points,
      allPoints,
      createdAt: dateNow.toISOString(),
      updatedAt: dateNow.toISOString(),
    });

    const log = this.parse(logDb);
    return log;
  }

  public insertBulk(logs: Log[]): void {
    this.dbConn.insertMany<LogTable>('Logs', logs.map(this.parseDb));
  }

  public reset = () => this.dbConn.truncate<LogTable>('Logs');

  public getUserBets(userId: string): Log[] {
    const logs = this.dbConn.getMany<LogTable>('Logs', { where: { eq: { userId }, ne: { type: 'REWARD' } } });
    return logs.map(this.parse);
  }
}

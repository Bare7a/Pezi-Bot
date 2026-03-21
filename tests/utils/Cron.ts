import { Cron, ICron } from '../../types/models/Cron';
import { DbActions } from '../../types/utils/DB';
import { MockDbState } from './Db';

export const createTestCron = <T extends ICron>(
  db: DbActions & { state: MockDbState },
  defaults: Omit<Cron<T>, 'id' | 'createdAt' | 'updatedAt'>,
  overrides: Partial<Cron<T>> = {},
): Cron<T> => {
  const Cron = {
    ...structuredClone(defaults),
    id: db.state.crons.size + 1,
    createdAt: overrides?.createdAt ?? new Date(0),
    updatedAt: overrides?.updatedAt ?? new Date(0),
    lastCalledAt: overrides?.lastCalledAt ?? new Date(0),
    ...structuredClone(overrides),
    opts: { ...structuredClone(defaults.opts), ...structuredClone(overrides?.opts ?? {}) },
  };

  db.Cron.update(defaults.type, Cron);
  return Cron;
};

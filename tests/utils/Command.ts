import { PointsCommand } from '../../commands/Points';
import { Command, ICommand } from '../../types/models/Command';
import { DbActions } from '../../types/utils/DB';
import { MockDbState } from './Db';

export const createTestCommand = <T extends ICommand>(
  defaults: Omit<Command<T>, 'id' | 'createdAt' | 'updatedAt'>,
  db: DbActions & { state: MockDbState },
  overrides: Partial<Command<T>> = {},
): Command<T> => {
  const command = {
    ...defaults,
    ...overrides,
    id: overrides?.id ?? 1,
    createdAt: overrides?.createdAt ?? new Date(0),
    updatedAt: overrides?.updatedAt ?? new Date(0),
    lastCalledAt: overrides?.lastCalledAt ?? new Date(0),
    opts: { ...defaults.opts, ...(overrides?.opts ?? {}) },
  };

  db.Command.update(command);
  return command;
};

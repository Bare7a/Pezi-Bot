import { Command, ICommand } from '../../types/models/Command';
import { DbActions } from '../../types/utils/DB';
import { MockDbState } from './Db';

export const createTestCommand = <T extends ICommand>(
  db: DbActions & { state: MockDbState },
  defaults: Omit<Command<T>, 'id' | 'createdAt' | 'updatedAt'>,
  overrides: Partial<Command<T>> = {},
): Command<T> => {
  const command = {
    ...structuredClone(defaults),
    id: db.state.commands.size + 1,
    createdAt: overrides?.createdAt ?? new Date(0),
    updatedAt: overrides?.updatedAt ?? new Date(0),
    lastCalledAt: overrides?.lastCalledAt ?? new Date(0),
    ...structuredClone(overrides),
    opts: { ...structuredClone(defaults.opts), ...structuredClone(overrides?.opts ?? {}) },
  };

  db.Command.update(command);
  return command;
};

import { mock } from 'bun:test';
import { User } from '../../types/models/User';
import { DbActions } from '../../types/utils/DB';
import { Command, ICommand } from '../../types/models/Command';

export type MockDbState = {
  users: Map<string, User>;
  commands: Map<string, Command<ICommand>>;
};

export const createMockDb = (initial?: Partial<MockDbState>): DbActions & { state: MockDbState } => {
  const state: MockDbState = {
    users: new Map(),
    commands: new Map(),
    ...initial,
  };

  const User = {
    sync: mock((u) => u),
    update: mock((user: User) => {
      state.users.set(user.userId, user);
      return user;
    }),
    reset: mock(() => {
      state.users.clear();
      return [];
    }),
    getRole: mock(() => 'member' as const),
    getById: mock((id: string) => state.users.get(id) || null),
    getByIds: mock((ids: string[]) => ids.map((id) => state.users.get(id)).filter((u): u is User => u !== undefined)),
    getByUsername: mock((username: string) => {
      return [...state.users.values()].find((u) => u.username === username) || null;
    }),
    getTopUsers: mock(() => [...state.users.values()].sort((a, b) => b.points - a.points)),

    addAsChatter: mock(() => true),

    addPoints: mock((user: User, cost: number, points: number, type: string) => {
      const existing = state.users.get(user.userId) || user;

      existing.points += points;
      state.users.set(existing.userId, existing);

      return true;
    }),

    setPoints: mock((user: User, cost: number, points: number) => {
      const existing = state.users.get(user.userId) || user;

      existing.points = points;
      state.users.set(existing.userId, existing);

      return true;
    }),

    removePoints: mock((user: User, cost: number, points: number) => {
      const existing = state.users.get(user.userId) || user;

      existing.points -= points;
      state.users.set(existing.userId, existing);

      return true;
    }),

    addPointsInBulk: mock(() => true),

    addWatchTime: mock((user: User, watchTime: number) => {
      const existing = state.users.get(user.userId) || user;

      existing.watchTime += watchTime;
      state.users.set(existing.userId, existing);

      return true;
    }),

    addWatchTimeInBulk: mock(() => true),
  };

  const Command = {
    fetch: mock((type: string) => {
      return [...state.commands.values()].find((c) => c.type === type) || null;
    }),

    fetchByName: mock((name: string) => state.commands.get(name) || null),

    update: mock((command: Command<ICommand>) => {
      state.commands.set(command.name, command);
      return command;
    }),

    deleteById: mock(() => {}),

    canUserExecute: mock(() => true),
    addCooldowns: mock(() => {}),

    createNewMessage: mock(() => {
      throw new Error('Not implemented in mock');
    }),

    execute: mock(() => true),

    getCost: mock((command: Command<ICommand>, customCost: string) => {
      if (command.customCost && customCost) {
        const parsed = Number(customCost);
        return isNaN(parsed) ? command.cost : parsed;
      }
      return command.cost;
    }),
  };

  const Log = {
    reset: mock(() => {}),
    insert: mock(() => {
      return {
        id: 1,
      } as any;
    }),
    insertBulk: mock(() => {}),
    getUserBets: mock(() => []),
  };

  const Cron = {
    fetch: mock(() => {
      throw new Error('Not implemented');
    }),
    update: mock(() => {
      throw new Error('Not implemented');
    }),
    isExecutePermited: mock(() => true),
    getCallAtDate: mock(() => new Date()),
    resetExecution: mock(() => {}),
  };

  return {
    state,
    User,
    Command,
    Log,
    Cron,
  };
};

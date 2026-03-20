import { test, expect, beforeEach, mock } from 'bun:test';
import { WatchTimeCommand } from '../../commands/WatchTime';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { Command, IWatchTimeCommand } from '../../types/models/Command';
import { env } from '../../utils/Config';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;

const createTestWatchTimeCommand = (overrides?: Partial<Command<IWatchTimeCommand>>): Command<IWatchTimeCommand> => {
  return {
    ...WatchTimeCommand.defaultConfig,
    id: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
    opts: {
      ...WatchTimeCommand.defaultConfig.opts,
      ...(overrides?.opts ?? {}),
    },
  };
};

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();

  env.botStreamer = 'pezi';
});

//
// ❌ INVALID CASES
//

test('returns false if user does not have enough points', () => {
  const user = createTestUser({ points: 5, watchTime: 3600 }, db);
  const command = createTestWatchTimeCommand({ cost: 10 });

  const result = WatchTimeCommand.execute(user, [], command, db, bot);

  expect(result).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
  expect(db.User.removePoints).not.toHaveBeenCalled();
});

//
// ✅ VALID CASES
//

test('returns true and sends correct watch time (minutes)', () => {
  const user = createTestUser({ points: 100, watchTime: 120 }, db); // 2 minute
  const command = createTestWatchTimeCommand();

  WatchTimeCommand.execute(user, [], command, db, bot);

  expect(bot.send).toHaveBeenCalledWith(`${user.username} has watched pezi for 2 minutes`);
});

test('returns correct watch time (hours + minutes)', () => {
  const user = createTestUser({ points: 100, watchTime: 3660 }, db); // 1h 1
  const command = createTestWatchTimeCommand();

  WatchTimeCommand.execute(user, [], command, db, bot);

  expect(bot.send).toHaveBeenCalledWith(`${user.username} has watched pezi for 1 hours 1 minutes`);
});

test('returns correct watch time (days + hours + minutes)', () => {
  // 1d 1h 1m
  const user = createTestUser({ points: 100, watchTime: 90061 }, db);
  const command = createTestWatchTimeCommand();

  WatchTimeCommand.execute(user, [], command, db, bot);

  expect(bot.send).toHaveBeenCalledWith(`${user.username} has watched pezi for 1 days 1 hours 1 minutes`);
});

test('deducts cost from user', () => {
  const user = createTestUser({ points: 100, watchTime: 60 }, db);
  const command = createTestWatchTimeCommand({ cost: 10 });

  WatchTimeCommand.execute(user, [], command, db, bot);

  const userData = expect.objectContaining({ userId: user.userId });
  expect(db.User.removePoints).toHaveBeenCalledWith(userData, 10, 10, 'WATCH_TIME', undefined);
});

test('uses custom cost from params', () => {
  const user = createTestUser({ points: 100, watchTime: 60 }, db);
  const command = createTestWatchTimeCommand({ customCost: true, cost: 25 });

  WatchTimeCommand.execute(user, ['25'], command, db, bot);

  const userData = expect.objectContaining({ userId: user.userId });
  expect(db.User.removePoints).toHaveBeenCalledWith(userData, 25, 25, 'WATCH_TIME', undefined);
});

//
// 🧩 TEMPLATE TEST
//

test('replaces template variables correctly', () => {
  const user = createTestUser({ points: 100, watchTime: 60 }, db);
  const command = createTestWatchTimeCommand({
    opts: {
      messages: {
        userWatchInfo: '$user watched $streamer for $watchTime total',
        minutes: 'minutes',
        hours: 'hours',
        days: 'days',
      },
    },
  });

  WatchTimeCommand.execute(user, [], command, db, bot);

  expect(bot.send).toHaveBeenCalledWith(`${user.username} watched pezi for 1 minutes total`);
});

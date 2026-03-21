import { test, expect, beforeEach } from 'bun:test';
import { env } from '../../utils/Config';
import { WatchTimeCommand } from '../../commands/WatchTime';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { createTestCommand } from '../utils/Command';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();

  env.botStreamer = 'pezi';
});

//
// ❌ INVALID CASES
//

test('returns false if user does not have enough points', () => {
  const user = createTestUser(db, { points: 5, watchTime: 3600 });
  const command = createTestCommand(WatchTimeCommand.defaultConfig, db, { cost: 10 });

  const result = WatchTimeCommand.execute(user, [], command, db, bot);

  expect(result).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
  expect(db.User.removePoints).not.toHaveBeenCalled();
});

//
// ✅ VALID CASES
//

test('returns true and sends correct watch time (minutes)', () => {
  const user = createTestUser(db, { points: 100, watchTime: 120 }); // 2 minute
  const command = createTestCommand(WatchTimeCommand.defaultConfig, db);

  WatchTimeCommand.execute(user, [], command, db, bot);

  expect(bot.send).toHaveBeenCalledWith(`${user.username} has watched pezi for 2 minutes`);
});

test('returns correct watch time (hours + minutes)', () => {
  const user = createTestUser(db, { points: 100, watchTime: 3660 }); // 1h 1
  const command = createTestCommand(WatchTimeCommand.defaultConfig, db);

  WatchTimeCommand.execute(user, [], command, db, bot);

  expect(bot.send).toHaveBeenCalledWith(`${user.username} has watched pezi for 1 hours 1 minutes`);
});

test('returns correct watch time (days + hours + minutes)', () => {
  // 1d 1h 1m
  const user = createTestUser(db, { points: 100, watchTime: 90061 });
  const command = createTestCommand(WatchTimeCommand.defaultConfig, db);

  WatchTimeCommand.execute(user, [], command, db, bot);

  expect(bot.send).toHaveBeenCalledWith(`${user.username} has watched pezi for 1 days 1 hours 1 minutes`);
});

test('deducts cost from user', () => {
  const user = createTestUser(db, { points: 100, watchTime: 60 });
  const command = createTestCommand(WatchTimeCommand.defaultConfig, db, { cost: 10 });

  WatchTimeCommand.execute(user, [], command, db, bot);

  const userData = expect.objectContaining({ userId: user.userId });
  expect(db.User.removePoints).toHaveBeenCalledWith(userData, 10, 10, 'WATCH_TIME', undefined);
});

test('uses custom cost from params', () => {
  const user = createTestUser(db, { points: 100, watchTime: 60 });
  const command = createTestCommand(WatchTimeCommand.defaultConfig, db, { customCost: true, cost: 25 });

  WatchTimeCommand.execute(user, ['25'], command, db, bot);

  const userData = expect.objectContaining({ userId: user.userId });
  expect(db.User.removePoints).toHaveBeenCalledWith(userData, 25, 25, 'WATCH_TIME', undefined);
});

//
// 🧩 TEMPLATE TEST
//

test('replaces template variables correctly', () => {
  const user = createTestUser(db, { points: 100, watchTime: 60 });
  const command = createTestCommand(WatchTimeCommand.defaultConfig, db, {
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

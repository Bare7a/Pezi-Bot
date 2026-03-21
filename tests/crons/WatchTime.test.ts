import { test, expect, beforeEach } from 'bun:test';
import { WatchTimeCron } from '../../crons/WatchTime';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestCron } from '../utils/Cron';
import { StatusCron } from '../../crons/Status';
import { createTestUser } from '../utils/User';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();
});

//
// ❌ INVALID CASES
//

test('returns false if execution is not permitted', async () => {
  createTestCron(db, WatchTimeCron.defaultConfig, { callAt: new Date(Date.now() + 100000) });
  createTestCron(db, StatusCron.defaultConfig, { opts: { isOnline: true } });

  const result = await WatchTimeCron.execute(db, bot);
  expect(result).toBe(false);
});

test('returns false if stream is offline', async () => {
  createTestCron(db, WatchTimeCron.defaultConfig);
  createTestCron(db, StatusCron.defaultConfig, { opts: { isOnline: false } });

  const result = await WatchTimeCron.execute(db, bot);
  expect(result).toBe(false);
});

//
// ✅ VALID CASES
//

test('updates watch time for viewers when execution is permitted', async () => {
  const watchTimeCron = createTestCron(db, WatchTimeCron.defaultConfig);
  createTestCron(db, StatusCron.defaultConfig, { interval: 120, opts: { isOnline: true } });

  // Create test users
  const viewers = [createTestUser(db, { userId: 'u1', points: 0 }), createTestUser(db, { userId: 'u2', points: 0 })];
  const viewerIds = viewers.map((v) => v.userId);

  bot.setViewers(viewerIds);

  const result = await WatchTimeCron.execute(db, bot);
  expect(result).toBe(true);

  // Verify bulk update was called with correct IDs and interval
  expect(db.User.addWatchTimeInBulk).toHaveBeenCalledWith(viewerIds, 120);

  // Verify cron state updated
  expect(watchTimeCron.isExecuting).toBe(false);
  expect(watchTimeCron.callAt.getTime()).toBeGreaterThan(watchTimeCron.lastCalledAt.getTime());

  // db.Cron.update should have been called twice (start + finish)
  expect(db.Cron.update).toHaveBeenCalledTimes(4);
});

test('handles no viewers gracefully', async () => {
  const watchTimeCron = createTestCron(db, WatchTimeCron.defaultConfig);
  createTestCron(db, StatusCron.defaultConfig, { interval: 60, opts: { isOnline: true } });

  bot.setViewers([]);

  const result = await WatchTimeCron.execute(db, bot);
  expect(result).toBe(true);

  // Should still call addWatchTimeInBulk with empty array
  expect(db.User.addWatchTimeInBulk).toHaveBeenCalledWith([], 60);

  expect(watchTimeCron.isExecuting).toBe(false);
  expect(watchTimeCron.callAt.getTime()).toBeGreaterThan(watchTimeCron.lastCalledAt.getTime());
});

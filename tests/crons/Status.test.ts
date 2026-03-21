import { test, expect, beforeEach } from 'bun:test';
import { StatusCron } from '../../crons/Status';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestCron } from '../utils/Cron';

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
  // Set callAt in the future
  createTestCron(db, StatusCron.defaultConfig, { callAt: new Date(Date.now() + 100000) });

  const result = await StatusCron.execute(db, bot);
  expect(result).toBe(false);
});

//
// ✅ VALID CASES
//

test('updates stream online status when execution is permitted', async () => {
  const statusCron = createTestCron(db, StatusCron.defaultConfig, { callAt: new Date(0) });

  // Mock bot to return stream online status
  bot.setIsOnline(true);

  const result = await StatusCron.execute(db, bot);
  expect(result).toBe(true);

  // Cron should update isExecuting correctly
  expect(statusCron.isExecuting).toBe(false);

  // lastCalledAt should be updated
  expect(statusCron.lastCalledAt.getTime()).toBeGreaterThan(0);

  // callAt should be set to lastCalledAt + interval
  expect(statusCron.callAt.getTime()).toBeGreaterThan(statusCron.lastCalledAt.getTime() - 1000);

  // isOnline should reflect bot status
  expect(statusCron.opts.isOnline).toBe(true);

  // db.Cron.update should have been called twice (start + finish)
  expect(db.Cron.update).toHaveBeenCalledTimes(3);
});

test('updates stream offline status correctly', async () => {
  const statusCron = createTestCron(db, StatusCron.defaultConfig, { callAt: new Date(0) });

  // Mock bot to return offline
  bot.setIsOnline(false);

  const result = await StatusCron.execute(db, bot);
  expect(result).toBe(true);

  expect(statusCron.opts.isOnline).toBe(false);
  expect(statusCron.isExecuting).toBe(false);
  expect(db.Cron.update).toHaveBeenCalledTimes(3);
});

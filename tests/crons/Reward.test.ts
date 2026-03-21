import { test, expect, beforeEach, mock } from 'bun:test';
import { RewardCron } from '../../crons/Reward';
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
  createTestCron(db, RewardCron.defaultConfig, { callAt: new Date(Number(new Date()) + 100000) });
  createTestCron(db, StatusCron.defaultConfig, { opts: { isOnline: true } });

  const result = await RewardCron.execute(db, bot);
  expect(result).toBe(false);
});

test('returns false if stream is offline', async () => {
  createTestCron(db, RewardCron.defaultConfig);
  createTestCron(db, StatusCron.defaultConfig, { opts: { isOnline: false } });

  const result = await RewardCron.execute(db, bot);
  expect(result).toBe(false);
});

//
// ✅ VALID CASES
//

test('gives rewards to viewers and chatters', async () => {
  // Create test users with different roles
  const viewers = [
    createTestUser(db, { username: 'Viewer1', points: 0 }),
    createTestUser(db, { username: 'Viewer2', isSub: true, points: 0 }),
    createTestUser(db, { username: 'Viewer3', isMod: true, points: 0 }),
    createTestUser(db, { username: 'Viewer4', isAdmin: true, points: 0 }),
    createTestUser(db, { username: 'Viewer5', isStreamer: true, points: 0 }),
  ];
  const viewersId = viewers.map((v) => v.userId);

  const chatters = [
    createTestUser(db, { username: 'Chatter1', points: 0 }),
    createTestUser(db, { username: 'Chatter2', isSub: true, points: 0 }),
    createTestUser(db, { username: 'Chatter3', isMod: true, points: 0 }),
    createTestUser(db, { username: 'Chatter4', isAdmin: true, points: 0 }),
    createTestUser(db, { username: 'Chatter5', isStreamer: true, points: 0 }),
  ];
  const chatterIds = chatters.map((c) => c.userId);

  const allViewers = [...viewersId, ...chatterIds];
  const chatterObjIds = chatterIds.reduce((obj, val) => ({ ...obj, [val]: true }), {});

  const rewardOptions = { opts: { ...RewardCron.defaultConfig.opts, chatters: chatterObjIds } };
  const rewardCron = createTestCron(db, RewardCron.defaultConfig, rewardOptions);

  createTestCron(db, StatusCron.defaultConfig, { opts: { isOnline: true } });
  bot.setViewers(allViewers);

  const result = await RewardCron.execute(db, bot);
  expect(result).toBe(true);

  // Verify addPointsInBulk is called for view rewards
  const pointsAdder = db.User.addPointsInBulk;

  expect(pointsAdder).toHaveBeenCalledWith(['viewer1', 'chatter1'], 0, RewardCron.defaultConfig.opts.view.member);
  expect(pointsAdder).toHaveBeenCalledWith(['viewer2', 'chatter2'], 0, RewardCron.defaultConfig.opts.view.sub);
  expect(pointsAdder).toHaveBeenCalledWith(['viewer3', 'chatter3'], 0, RewardCron.defaultConfig.opts.view.mod);
  expect(pointsAdder).toHaveBeenCalledWith(['viewer4', 'chatter4'], 0, RewardCron.defaultConfig.opts.view.admin);
  expect(pointsAdder).toHaveBeenCalledWith(['viewer5', 'chatter5'], 0, RewardCron.defaultConfig.opts.view.streamer);

  // Verify addPointsInBulk is called for chatter rewards
  expect(pointsAdder).toHaveBeenCalledWith(['chatter1'], 0, RewardCron.defaultConfig.opts.chat.member);
  expect(pointsAdder).toHaveBeenCalledWith(['chatter2'], 0, RewardCron.defaultConfig.opts.chat.sub);
  expect(pointsAdder).toHaveBeenCalledWith(['chatter3'], 0, RewardCron.defaultConfig.opts.chat.mod);
  expect(pointsAdder).toHaveBeenCalledWith(['chatter4'], 0, RewardCron.defaultConfig.opts.chat.admin);
  expect(pointsAdder).toHaveBeenCalledWith(['chatter5'], 0, RewardCron.defaultConfig.opts.chat.streamer);

  // Verify logs inserted
  expect(db.state.logs).toHaveLength(10);
  expect(db.Log.insertBulk).toHaveBeenCalledTimes(1);

  // Verify cron state reset
  expect(rewardCron.isExecuting).toBe(false);
  expect(rewardCron.opts.chatters).toEqual({});
  expect(rewardCron.callAt.getTime()).toBeGreaterThan(rewardCron.lastCalledAt.getTime());
});

test('handles no viewers gracefully', async () => {
  const rewardCron = createTestCron(db, RewardCron.defaultConfig);
  createTestCron(db, StatusCron.defaultConfig, { opts: { isOnline: true } });

  const result = await RewardCron.execute(db, bot);
  expect(result).toBe(true);
  expect(db.User.addPointsInBulk).not.toHaveBeenCalled();
  expect(db.Log.insertBulk).toHaveBeenCalledWith([]);

  expect(rewardCron.isExecuting).toBe(false);
  expect(rewardCron.opts.chatters).toEqual({});
  expect(rewardCron.callAt.getTime()).toBeGreaterThan(rewardCron.lastCalledAt.getTime());
});

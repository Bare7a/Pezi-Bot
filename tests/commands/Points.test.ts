import { test, expect, beforeEach, mock } from 'bun:test';
import { PointsCommand } from '../../commands/Points';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { Command, IPointsCommand } from '../../types/models/Command';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;

// helper to create a points command
const createTestPointsCommand = (overrides?: Partial<Command<IPointsCommand>>): Command<IPointsCommand> => {
  return {
    ...PointsCommand.defaultConfig,
    id: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
    opts: {
      ...PointsCommand.defaultConfig.opts,
      ...(overrides?.opts ?? {}),
    },
  };
};

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();
});

//
// ❌ INVALID CASES
//

test('returns false if target user does not exist for admin actions', () => {
  const user = createTestUser({ isAdmin: true }, db);
  const command = createTestPointsCommand();

  const result = PointsCommand.execute(user, ['add', '@nonexistent', '50'], command, db, bot);
  expect(result).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

test('returns points info if modifier is missing', () => {
  const user = createTestUser({}, db);
  const command = createTestPointsCommand();

  const result = PointsCommand.execute(user, [], command, db, bot);
  expect(result).toBe(true);
  expect(bot.send).toHaveBeenCalledWith('Tester you have 100 coins LUL');
});

test('returns points info if user is not admin and tries add/set/remove', () => {
  const user = createTestUser({}, db);
  const command = createTestPointsCommand();

  const result = PointsCommand.execute(user, ['add', '@Tester', '50'], command, db, bot);
  expect(result).toBe(true);
  expect(bot.send).toHaveBeenCalledWith('Tester you have 100 coins LUL');
});

//
// ✅ VALID CASES
//

test('admin can add points to a user', () => {
  const user = createTestUser({ isAdmin: true }, db);
  const command = createTestPointsCommand();
  const target = createTestUser({ username: 'TargerUser', points: 50 }, db);

  const result = PointsCommand.execute(user, ['add', `@${target.username}`, '25'], command, db, bot);
  expect(result).toBe(true);
  expect(db.User.addPoints).toHaveBeenCalledWith(target, 0, 25, 'POINTS', undefined);
});

test('admin can set points for a user', () => {
  const user = createTestUser({ isAdmin: true }, db);
  const command = createTestPointsCommand();
  const target = createTestUser({ username: 'TargerUser', points: 50 }, db);

  const result = PointsCommand.execute(user, ['set', `@${target.username}`, '200'], command, db, bot);
  expect(result).toBe(true);
  expect(db.User.setPoints).toHaveBeenCalledWith(target, 0, 200, 'POINTS', undefined);
});

test('admin can remove points from a user', () => {
  const user = createTestUser({ isAdmin: true }, db);
  const command = createTestPointsCommand();
  const target = createTestUser({ username: 'TargerUser', points: 50 }, db);

  const result = PointsCommand.execute(user, ['remove', `@${target.username}`, '20'], command, db, bot);
  expect(result).toBe(true);
  expect(db.User.removePoints).toHaveBeenCalledWith(target, 0, 20, 'POINTS', undefined);
});

test('streamer can reset points and logs', () => {
  const user = createTestUser({ isStreamer: true }, db);
  const command = createTestPointsCommand();

  const result = PointsCommand.execute(user, ['reset'], command, db, bot);
  expect(result).toBe(true);
  expect(db.User.reset).toHaveBeenCalled();
  expect(db.Log.reset).toHaveBeenCalled();
});

test('any user can view top users', () => {
  const user = createTestUser({}, db);
  const command = createTestPointsCommand();

  createTestUser({ username: 'Alice', points: 200 }, db);
  createTestUser({ username: 'Bob', points: 50 }, db);
  createTestUser({ username: 'Charlie', points: 150 }, db);

  const result = PointsCommand.execute(user, ['top'], command, db, bot);
  expect(result).toBe(true);
  expect(bot.send).toHaveBeenCalledWith('[1] Alice (200) | [2] Charlie (150) | [3] Tester (100) | [4] Bob (50)');
});

test('sends correct points message based on thresholds', () => {
  const user = createTestUser({ points: 600 }, db);
  const command = createTestPointsCommand();

  const result = PointsCommand.execute(user, ['info'], command, db, bot);
  expect(result).toBe(true);
  expect(bot.send).toHaveBeenCalledWith('Tester you have 600 coins SeemsGood');
});

test('returns false if no points message matches', () => {
  const user = createTestUser({ points: -10 }, db);
  const command = createTestPointsCommand();

  const result = PointsCommand.execute(user, ['info'], command, db, bot);
  expect(result).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

import { test, expect, beforeEach, mock, afterAll, beforeAll } from 'bun:test';

import { FlipCommand } from '../../commands/Flip';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { createTestCommand } from '../utils/Command';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;
let originalRandom: typeof Math.random;

beforeAll(() => {
  originalRandom = Math.random;
});

afterAll(() => {
  Math.random = originalRandom;
});

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();
});

//
// ❌ INVALID CASES
//

test('returns false if user has insufficient points', () => {
  const user = createTestUser(db, { points: 5 });
  const command = createTestCommand(db, FlipCommand.defaultConfig, { cost: 10 });

  const result = FlipCommand.execute(user, [], command, db, bot);

  expect(result).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
  expect(db.User.addPoints).not.toHaveBeenCalled();
  expect(db.User.getById(user.userId)?.points).toBe(5);
});

test('returns false if cost is 0', () => {
  const user = createTestUser(db, {});
  const command = createTestCommand(db, FlipCommand.defaultConfig, { cost: 0 });

  const result = FlipCommand.execute(user, [], command, db, bot);

  expect(result).toBe(false);
  expect(db.User.addPoints).not.toHaveBeenCalled();
});

//
// 🎲 LOSING CASE
//

test('losing flip deducts points and sends correct message', () => {
  Math.random = mock(() => 0.2);

  const user = createTestUser(db, {});
  const command = createTestCommand(db, FlipCommand.defaultConfig);

  FlipCommand.execute(user, [], command, db, bot);

  const updatedUser = db.User.getById(user.userId);
  expect(updatedUser?.points).toBe(90);
  expect(bot.send).toHaveBeenCalledWith('Tester flipped a coin VoteNay and lost 10 coins!');
});

//
// 🏆 WINNING CASE
//

test('winning flip adds points and sends correct message', () => {
  Math.random = mock(() => 0.9);

  const user = createTestUser(db, {});
  const command = createTestCommand(db, FlipCommand.defaultConfig);

  FlipCommand.execute(user, [], command, db, bot);

  const updatedUser = db.User.getById(user.userId);
  expect(updatedUser?.points).toBe(110);
  expect(bot.send).toHaveBeenCalledWith('Tester flipped a coin VoteYea and won 20 coins!');
});

//
// 🧩 TEMPLATE TEST
//

test('replaces all template variables correctly', () => {
  Math.random = mock(() => 0.9);

  const user = createTestUser(db, {});

  const command = createTestCommand(db, FlipCommand.defaultConfig, {
    opts: {
      multi: 3,
      messages: {
        won: '$user bet $cost and got $reward ($multiplier x) $currency',
        lost: 'nope',
      },
    },
  });

  FlipCommand.execute(user, [], command, db, bot);

  expect(bot.send).toHaveBeenCalledWith('Tester bet 10 and got 30 (3 x) coins');
});

test('uses custom cost from params', () => {
  Math.random = mock(() => 0.9);

  const user = createTestUser(db, {});
  const command = createTestCommand(db, FlipCommand.defaultConfig, { customCost: true });

  FlipCommand.execute(user, ['25'], command, db, bot);

  const updatedUser = db.User.getById(user.userId);
  expect(updatedUser?.points).toBe(125);
});

test('calls addPoints with correct values', () => {
  Math.random = mock(() => 0.9);

  const user = createTestUser(db, {});
  const command = createTestCommand(db, FlipCommand.defaultConfig);

  FlipCommand.execute(user, [], command, db, bot);

  const userData = expect.objectContaining({ userId: user.userId });
  expect(db.User.addPoints).toHaveBeenCalledWith(userData, 10, 10, 'FLIP', db.Log);
});

import { test, expect, beforeEach, beforeAll, afterAll, mock } from 'bun:test';
import { env } from '../../utils/Config';
import { DiceCommand } from '../../commands/Dice';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { createTestCommand } from '../utils/Command';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;
let originalRandom: typeof Math.random;

beforeAll(() => {
  originalRandom = Math.random;
  env.botCurrencyName = 'coins';
  Math.random = mock(() => 0.5);
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
  const command = createTestCommand(DiceCommand.defaultConfig, db);

  const result = DiceCommand.execute(user, [], command, db, bot);

  expect(result).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
  expect(db.User.addPoints).not.toHaveBeenCalled();
});

test('returns false if cost is 0', () => {
  const user = createTestUser(db, {});
  const command = createTestCommand(DiceCommand.defaultConfig, db, { cost: 0 });

  const result = DiceCommand.execute(user, [], command, db, bot);

  expect(result).toBe(false);
  expect(db.User.addPoints).not.toHaveBeenCalled();
});

//
// 🎲 LOSING CASE
//

test('losing dice roll deducts points and sends correct message', () => {
  // simulate low sum: 1+1+1 = 3
  Math.random = mock(() => 0); // each dice = 1

  const user = createTestUser(db, {});
  const command = createTestCommand(DiceCommand.defaultConfig, db);

  DiceCommand.execute(user, [], command, db, bot);

  const updatedUser = db.User.getById(user.userId);
  expect(updatedUser?.points).toBe(90); // lost cost 10

  expect(bot.send).toHaveBeenCalledWith('Tester threw the dices [1] [1] [1] and lost 10 coins!');
});

//
// 🏆 WINNING CASES
//

test('winning dice roll with multiS multiplier', () => {
  // simulate sum 12: 4+4+4
  let rolls = [4, 4, 4];
  let index = 0;
  Math.random = mock(() => (rolls[index++] - 1) / 6);

  const user = createTestUser(db, {});
  const command = createTestCommand(DiceCommand.defaultConfig, db);

  DiceCommand.execute(user, [], command, db, bot);

  const updatedUser = db.User.getById(user.userId);
  expect(updatedUser?.points).toBe(110); // cost 10, reward = 2*10=20, net +10

  expect(bot.send).toHaveBeenCalledWith('Tester threw the dices [4] [4] [4] and won (x2) 20 coins!');
});

test('winning dice roll with multiM multiplier', () => {
  // simulate sum 16: 6+5+5
  let rolls = [6, 5, 5];
  let index = 0;
  Math.random = mock(() => (rolls[index++] - 1) / 6);

  const user = createTestUser(db, {});
  const command = createTestCommand(DiceCommand.defaultConfig, db);

  DiceCommand.execute(user, [], command, db, bot);

  const updatedUser = db.User.getById(user.userId);
  expect(updatedUser?.points).toBe(140); // cost 10, reward=50, net+40

  expect(bot.send).toHaveBeenCalledWith('Tester threw the dices [6] [5] [5] and won (x5) 50 coins!');
});

test('winning dice roll with multiL multiplier', () => {
  // simulate sum 17: 6+6+5
  let rolls = [6, 6, 5];
  let index = 0;
  Math.random = mock(() => (rolls[index++] - 1) / 6);

  const user = createTestUser(db, {});
  const command = createTestCommand(DiceCommand.defaultConfig, db);

  DiceCommand.execute(user, [], command, db, bot);

  const updatedUser = db.User.getById(user.userId);
  expect(updatedUser?.points).toBe(240); // cost 10, reward=150, net+140

  expect(bot.send).toHaveBeenCalledWith('Tester threw the dices [6] [6] [5] and won (x15) 150 coins!');
});

test('winning dice roll with multiJ multiplier', () => {
  // simulate sum 18: 6+6+6
  let rolls = [6, 6, 6];
  let index = 0;
  Math.random = mock(() => (rolls[index++] - 1) / 6);

  const user = createTestUser(db, {});
  const command = createTestCommand(DiceCommand.defaultConfig, db);

  DiceCommand.execute(user, [], command, db, bot);

  const updatedUser = db.User.getById(user.userId);
  expect(updatedUser?.points).toBe(590); // cost 10, reward=500, net+490

  expect(bot.send).toHaveBeenCalledWith('Tester threw the dices [6] [6] [6] and won (x50) 500 coins!');
});

//
// 🧩 TEMPLATE VARIABLES
//

test('replaces template variables correctly', () => {
  // sum 12 → multiS
  let rolls = [4, 4, 4];
  let index = 0;
  Math.random = mock(() => (rolls[index++] - 1) / 6);

  const user = createTestUser(db, {});

  const command = createTestCommand(DiceCommand.defaultConfig, db, {
    opts: {
      messages: {
        won: '$user rolled $dices and got $reward $currency!',
        lost: 'oh no $user lost $cost $currency',
      },
      multiS: DiceCommand.defaultConfig.opts.multiS,
      multiM: DiceCommand.defaultConfig.opts.multiM,
      multiL: DiceCommand.defaultConfig.opts.multiL,
      multiJ: DiceCommand.defaultConfig.opts.multiJ,
    },
  });

  DiceCommand.execute(user, [], command, db, bot);

  expect(bot.send).toHaveBeenCalledWith('Tester rolled [4] [4] [4] and got 20 coins!');
});

//
// 💰 CUSTOM COST
//

test('uses custom cost from params', () => {
  let rolls = [4, 4, 4];
  let index = 0;
  Math.random = mock(() => (rolls[index++] - 1) / 6);

  const user = createTestUser(db, {});
  const command = createTestCommand(DiceCommand.defaultConfig, db, { customCost: true });

  DiceCommand.execute(user, ['25'], command, db, bot);

  const updatedUser = db.User.getById(user.userId);
  expect(updatedUser?.points).toBe(125); // cost 25, reward=50, net +25
});

//
// 🔍 SIDE EFFECT VERIFICATION
//

test('calls addPoints with correct values', () => {
  let rolls = [4, 4, 4];
  let index = 0;
  Math.random = mock(() => (rolls[index++] - 1) / 6);

  const user = createTestUser(db, {});
  const command = createTestCommand(DiceCommand.defaultConfig, db);

  DiceCommand.execute(user, [], command, db, bot);

  const userData = expect.objectContaining({ userId: user.userId });
  expect(db.User.addPoints).toHaveBeenCalledWith(userData, 10, 10, 'DICE', db.Log);
});

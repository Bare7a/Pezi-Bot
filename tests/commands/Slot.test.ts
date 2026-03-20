import { test, expect, beforeEach, beforeAll, afterAll, mock } from 'bun:test';
import { env } from '../../utils/Config';
import { SlotCommand } from '../../commands/Slot';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { Command, ISlotCommand } from '../../types/models/Command';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;
let originalRandom: typeof Math.random;

beforeAll(() => {
  originalRandom = Math.random;
  env.botCurrencyName = 'coins';
});

afterAll(() => {
  Math.random = originalRandom;
});

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();
});

// helper to create a slot command
const createTestSlotCommand = (overrides?: Partial<Command<ISlotCommand>>): Command<ISlotCommand> => {
  return {
    ...SlotCommand.defaultConfig,
    id: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
    opts: {
      ...SlotCommand.defaultConfig.opts,
      ...(overrides?.opts ?? {}),
    },
  };
};

//
// ❌ INVALID CASES
//

test('returns false if user has insufficient points', () => {
  const user = createTestUser({ points: 5 }, db);
  const command = createTestSlotCommand();

  const result = SlotCommand.execute(user, [], command, db, bot);

  expect(result).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
  expect(db.User.addPoints).not.toHaveBeenCalled();
});

test('returns false if cost is 0', () => {
  const user = createTestUser({}, db);
  const command = createTestSlotCommand({ cost: 0 });

  const result = SlotCommand.execute(user, [], command, db, bot);

  expect(result).toBe(false);
  expect(db.User.addPoints).not.toHaveBeenCalled();
});

//
// 🎰 LOSING CASE
//

test('losing slot spin deducts points and sends correct message', () => {
  // pick different emotes: no match
  const emotes = SlotCommand.defaultConfig.opts.emoteList;
  let index = 0;
  Math.random = mock(() => {
    index++;
    return (index % emotes.length) / emotes.length;
  });

  const user = createTestUser({}, db);

  const command = createTestSlotCommand();

  SlotCommand.execute(user, [], command, db, bot);

  const updatedUser = db.User.getById(user.userId);
  expect(updatedUser?.points).toBe(90); // lost cost 10

  expect(bot.send).toHaveBeenCalledWith(expect.stringContaining('pulled the lever'));
});

//
// 🏆 WINNING CASES
//

test('winning slot with multiS', () => {
  // simulate slots[0] === slots[2] only → multiS
  const emotes = SlotCommand.defaultConfig.opts.emoteList;
  let rolls = [0, 1, 0]; // indices for emotes
  let idx = 0;
  Math.random = mock(() => rolls[idx++] / (emotes.length + 1));

  const user = createTestUser({}, db);

  const command = createTestSlotCommand();

  SlotCommand.execute(user, [], command, db, bot);

  const updatedUser = db.User.getById(user.userId);
  expect(updatedUser?.points).toBe(110);

  expect(bot.send).toHaveBeenCalledWith(expect.stringContaining('won (x2)'));
});

test('winning slot with multiJ', () => {
  // all super emotes → multiJ
  Math.random = mock(() => 1); // always pick last emote = superEmote

  const user = createTestUser({}, db);
  const command = createTestSlotCommand();

  SlotCommand.execute(user, [], command, db, bot);

  const updatedUser = db.User.getById(user.userId);
  expect(updatedUser?.points).toBe(390);

  expect(bot.send).toHaveBeenCalledWith(expect.stringContaining('won (x30)'));
});

//
// 💰 CUSTOM COST
//

test('uses custom cost from params', () => {
  let index = 0;
  Math.random = mock(() => index++ / 6);

  const user = createTestUser({}, db);
  const command = createTestSlotCommand({ customCost: true });

  SlotCommand.execute(user, ['25'], command, db, bot);

  const updatedUser = db.User.getById(user.userId);
  expect(updatedUser?.points).toBe(75); // lost 25
});

//
// 🔍 SIDE EFFECT VERIFICATION
//

test('calls addPoints with correct values', () => {
  let index = 0;
  Math.random = mock(() => index++ / 6);

  const user = createTestUser({}, db);
  const command = createTestSlotCommand();

  SlotCommand.execute(user, [], command, db, bot);

  const userData = expect.objectContaining({ userId: user.userId });
  expect(db.User.addPoints).toHaveBeenCalledWith(userData, 10, -10, 'SLOT', db.Log);
});

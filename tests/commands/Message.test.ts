import { test, expect, beforeEach, mock } from 'bun:test';
import { MessageCommand } from '../../commands/Message';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { Command, IMessageCommand } from '../../types/models/Command';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;

// helper to create a message command
const createTestMessageCommand = (overrides?: Partial<Command<IMessageCommand>>): Command<IMessageCommand> => ({
  ...MessageCommand.defaultConfig,
  id: 1,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
  opts: {
    ...MessageCommand.defaultConfig.opts,
    ...(overrides?.opts ?? {}),
  },
});

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();
});

//
// ❌ INVALID CASES
//

test('returns false if message contains unreplaced $target', () => {
  const user = createTestUser({}, db);
  const cmd = createTestMessageCommand({ opts: { message: 'Hello $target1 $target2' } });

  expect(MessageCommand.execute(user, ['Alice'], cmd, db, bot)).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

//
// ✅ VALID CASES
//

test('replaces $user and $target1 correctly', () => {
  const user = createTestUser({}, db);
  const cmd = createTestMessageCommand({ opts: { message: '$user slapped $target1' } });

  MessageCommand.execute(user, ['@Alice'], cmd, db, bot);

  expect(bot.send).toHaveBeenCalledWith('Tester slapped Alice');
});

test('replaces multiple targets correctly', () => {
  const user = createTestUser({}, db);
  const cmd = createTestMessageCommand({ opts: { message: '$user attacked $target1 and $target2' } });

  MessageCommand.execute(user, ['@Alice', '@Bob'], cmd, db, bot);

  expect(bot.send).toHaveBeenCalledWith('Tester attacked Alice and Bob');
});

test('removes @ from targets', () => {
  const user = createTestUser({}, db);
  const cmd = createTestMessageCommand({ opts: { message: '$user greeted $target1' } });

  MessageCommand.execute(user, ['@Charlie'], cmd, db, bot);

  expect(bot.send).toHaveBeenCalledWith('Tester greeted Charlie');
});

test('works if no @ in target', () => {
  const user = createTestUser({}, db);
  const cmd = createTestMessageCommand({ opts: { message: '$user greeted $target1' } });

  MessageCommand.execute(user, ['David'], cmd, db, bot);

  expect(bot.send).toHaveBeenCalledWith('Tester greeted David');
});

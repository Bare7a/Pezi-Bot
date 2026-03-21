import { test, expect, beforeEach } from 'bun:test';
import { MessageCommand } from '../../commands/Message';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { createTestCommand } from '../utils/Command';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();
});

//
// ❌ INVALID CASES
//

test('returns false if message contains unreplaced $target', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(db, MessageCommand.defaultConfig, { opts: { message: 'Hello $target1 $target2' } });

  expect(MessageCommand.execute(user, ['Alice'], cmd, db, bot)).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

//
// ✅ VALID CASES
//

test('replaces $user and $target1 correctly', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(db, MessageCommand.defaultConfig, { opts: { message: '$user slapped $target1' } });

  MessageCommand.execute(user, ['@Alice'], cmd, db, bot);

  expect(bot.send).toHaveBeenCalledWith('Tester slapped Alice');
});

test('replaces multiple targets correctly', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(db, MessageCommand.defaultConfig, {
    opts: { message: '$user attacked $target1 and $target2' },
  });

  MessageCommand.execute(user, ['@Alice', '@Bob'], cmd, db, bot);

  expect(bot.send).toHaveBeenCalledWith('Tester attacked Alice and Bob');
});

test('removes @ from targets', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(db, MessageCommand.defaultConfig, { opts: { message: '$user greeted $target1' } });

  MessageCommand.execute(user, ['@Charlie'], cmd, db, bot);

  expect(bot.send).toHaveBeenCalledWith('Tester greeted Charlie');
});

test('works if no @ in target', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(db, MessageCommand.defaultConfig, { opts: { message: '$user greeted $target1' } });

  MessageCommand.execute(user, ['David'], cmd, db, bot);

  expect(bot.send).toHaveBeenCalledWith('Tester greeted David');
});

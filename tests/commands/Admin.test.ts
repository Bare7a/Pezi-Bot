import { test, expect, beforeEach, mock } from 'bun:test';
import { AdminCommand } from '../../commands/Admin';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { Command, IAdminCommand } from '../../types/models/Command';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;

// helper to create admin command
const createTestAdminCommand = (overrides?: Partial<Command<IAdminCommand>>): Command<IAdminCommand> => ({
  ...AdminCommand.defaultConfig,
  id: 1,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
  opts: {
    ...AdminCommand.defaultConfig.opts,
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

test('returns false if missing modifier or username', () => {
  const user = createTestUser({}, db);
  const cmd = createTestAdminCommand();

  expect(AdminCommand.execute(user, [], cmd, db, bot)).toBe(false);
  expect(AdminCommand.execute(user, ['add'], cmd, db, bot)).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

test('returns false if target user not found', () => {
  const user = createTestUser({}, db);
  const cmd = createTestAdminCommand();

  expect(AdminCommand.execute(user, ['add', 'nonexistent'], cmd, db, bot)).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

test('returns false if invalid modifier', () => {
  const user = createTestUser({}, db);
  const target = createTestUser({ username: 'TargetUser' }, db);
  const cmd = createTestAdminCommand();

  expect(AdminCommand.execute(user, ['invalid', target.username], cmd, db, bot)).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

//
// ✅ VALID CASES
//

test('add modifier sets isAdmin true and sends message', () => {
  const user = createTestUser({ username: 'AdminUser' }, db);
  const target = createTestUser({ username: 'TargetUser', points: 50 }, db);
  const cmd = createTestAdminCommand();

  AdminCommand.execute(user, ['add', target.username], cmd, db, bot);

  expect(db.User.update).toHaveBeenCalledWith({ ...target, isAdmin: true });
  expect(bot.send).toHaveBeenCalledWith(`${user.username} added ${target.username} as admin`);
});

test('remove modifier sets isAdmin false and sends message', () => {
  const user = createTestUser({ username: 'AdminUser' }, db);
  const target = createTestUser({ username: 'TargetUser', points: 50 }, db);
  const cmd = createTestAdminCommand();

  AdminCommand.execute(user, ['remove', target.username], cmd, db, bot);

  expect(db.User.update).toHaveBeenCalledWith({ ...target, isAdmin: false });
  expect(bot.send).toHaveBeenCalledWith(`${user.username} removed ${target.username} from admins`);
});

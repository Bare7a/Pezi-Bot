import { test, expect, beforeEach } from 'bun:test';
import { CmdCommand } from '../../commands/Cmd';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { createTestCommand } from '../utils/Command';
import { NoteCommand } from '../../commands/Note';
import { AdminCommand } from '../../commands/Admin';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();
});

//
// ❌ INVALID CASES
//

test('returns false if missing modifier or command name', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(db, CmdCommand.defaultConfig);

  expect(CmdCommand.execute(user, [], cmd, db, bot)).toBe(false);
  expect(CmdCommand.execute(user, ['enable'], cmd, db, bot)).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

test('returns false if target command not found', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(db, CmdCommand.defaultConfig);

  expect(CmdCommand.execute(user, ['enable', 'nonexistent'], cmd, db, bot)).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

test('returns false if target command is ADMIN', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(db, CmdCommand.defaultConfig);
  const target = createTestCommand(db, AdminCommand.defaultConfig);

  expect(CmdCommand.execute(user, ['enable', target.name], cmd, db, bot)).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

//
// ✅ VALID CASES
//

test('enable modifier sets command to enabled and sends message', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(db, CmdCommand.defaultConfig);
  const target = createTestCommand(db, NoteCommand.defaultConfig, { isEnabled: false });

  CmdCommand.execute(user, ['enable', target.name], cmd, db, bot);

  expect(db.Command.update).toHaveBeenCalledWith({ ...target, isEnabled: true });
  expect(bot.send).toHaveBeenCalledWith(`${user.username} enable the command ${target.name}`);
});

test('disable modifier sets command to disabled and sends message', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(db, CmdCommand.defaultConfig);
  const target = createTestCommand(db, NoteCommand.defaultConfig, { isEnabled: true });

  CmdCommand.execute(user, ['disable', target.name], cmd, db, bot);

  expect(db.Command.update).toHaveBeenCalledWith({ ...target, isEnabled: false });
  expect(bot.send).toHaveBeenCalledWith(`${user.username} disabled the command ${target.name}`);
});

test('ucd modifier updates userCd and sends message', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(db, CmdCommand.defaultConfig);
  const target = createTestCommand(db, NoteCommand.defaultConfig, { userCd: 0 });

  CmdCommand.execute(user, ['ucd', target.name, '30'], cmd, db, bot);

  expect(db.Command.update).toHaveBeenCalledWith({ ...target, userCd: 30 });
  expect(bot.send).toHaveBeenCalledWith(`${user.username} changed the user CD for ${target.name} to 30`);
});

test('gcd modifier updates globalCd and sends message', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(db, CmdCommand.defaultConfig);
  const target = createTestCommand(db, NoteCommand.defaultConfig, { globalCd: 0 });

  CmdCommand.execute(user, ['gcd', target.name, '45'], cmd, db, bot);

  expect(db.Command.update).toHaveBeenCalledWith({ ...target, globalCd: 45 });
  expect(bot.send).toHaveBeenCalledWith(`${user.username} changed the user CD for ${target.name} to 45`);
});

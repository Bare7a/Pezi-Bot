import { test, expect, beforeEach, mock } from 'bun:test';
import { CmdCommand } from '../../commands/Cmd';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { Command, ICmdCommand } from '../../types/models/Command';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;

// helper to create a cmd command
const createTestCmdCommand = (overrides?: Partial<Command<ICmdCommand>>): Command<ICmdCommand> => {
  return {
    ...CmdCommand.defaultConfig,
    id: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
    opts: {
      ...CmdCommand.defaultConfig.opts,
      ...(overrides?.opts ?? {}),
    },
  };
};

// helper to create a target command to modify
const createTargetCommand = <T extends ICmdCommand>(overrides?: Partial<Command<T>>): Command<T> => {
  return {
    id: 2,
    name: 'targetCmd',
    type: 'CMD',
    permissions: ['admin', 'mod', 'streamer'],
    lastCalledAt: new Date(0),
    createdAt: new Date(0),
    updatedAt: new Date(0),
    userCd: 0,
    globalCd: 0,
    cost: 0,
    customCost: false,
    cdMessage: '',
    showCdMessage: true,
    isEnabled: true,
    onlyOnline: false,
    isLogEnabled: false,
    opts: CmdCommand.defaultConfig.opts,
    ...overrides,
  };
};

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();
});

//
// ❌ INVALID CASES
//

test('returns false if missing modifier or command name', () => {
  const user = createTestUser({}, db);
  const cmd = createTestCmdCommand();

  expect(CmdCommand.execute(user, [], cmd, db, bot)).toBe(false);
  expect(CmdCommand.execute(user, ['enable'], cmd, db, bot)).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

test('returns false if target command not found', () => {
  const user = createTestUser({}, db);
  const cmd = createTestCmdCommand();

  expect(CmdCommand.execute(user, ['enable', 'nonexistent'], cmd, db, bot)).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

test('returns false if target command is ADMIN', () => {
  const user = createTestUser({}, db);
  const cmd = createTestCmdCommand();

  const target = createTargetCommand({ type: 'ADMIN' as any });
  db.Command.update(target);

  expect(CmdCommand.execute(user, ['enable', target.name], cmd, db, bot)).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

//
// ✅ VALID CASES
//

test('enable modifier sets command to enabled and sends message', () => {
  const user = createTestUser({}, db);
  const cmd = createTestCmdCommand();

  const target = createTargetCommand({ isEnabled: false });
  db.Command.update(target);

  CmdCommand.execute(user, ['enable', target.name], cmd, db, bot);

  expect(db.Command.update).toHaveBeenCalledWith({ ...target, isEnabled: true });
  expect(bot.send).toHaveBeenCalledWith(`${user.username} enable the command ${target.name}`);
});

test('disable modifier sets command to disabled and sends message', () => {
  const user = createTestUser({}, db);
  const cmd = createTestCmdCommand();

  const target = createTargetCommand({ isEnabled: true });
  db.Command.update(target);

  CmdCommand.execute(user, ['disable', target.name], cmd, db, bot);

  expect(db.Command.update).toHaveBeenCalledWith({ ...target, isEnabled: false });
  expect(bot.send).toHaveBeenCalledWith(`${user.username} disabled the command ${target.name}`);
});

test('ucd modifier updates userCd and sends message', () => {
  const user = createTestUser({}, db);
  const cmd = createTestCmdCommand();

  const target = createTargetCommand({ userCd: 0 });
  db.Command.update(target);

  CmdCommand.execute(user, ['ucd', target.name, '30'], cmd, db, bot);

  expect(db.Command.update).toHaveBeenCalledWith({ ...target, userCd: 30 });
  expect(bot.send).toHaveBeenCalledWith(`${user.username} changed the user CD for ${target.name} to 30`);
});

test('gcd modifier updates globalCd and sends message', () => {
  const user = createTestUser({}, db);
  const cmd = createTestCmdCommand();

  const target = createTargetCommand({ globalCd: 0 });
  db.Command.update(target);

  CmdCommand.execute(user, ['gcd', target.name, '45'], cmd, db, bot);

  expect(db.Command.update).toHaveBeenCalledWith({ ...target, globalCd: 45 });
  expect(bot.send).toHaveBeenCalledWith(`${user.username} changed the user CD for ${target.name} to 45`);
});

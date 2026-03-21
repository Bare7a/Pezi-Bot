import { test, expect, beforeEach, mock } from 'bun:test';
import { NoteCommand } from '../../commands/Note';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { Command, IMessageCommand } from '../../types/models/Command';
import { createTestCommand } from '../utils/Command';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;

// helper to create a target note returned by fetchByName or createNewMessage
const createTargetNote = (overrides?: Partial<Command<IMessageCommand>>): Command<IMessageCommand> => {
  return {
    id: 2,
    name: 'note',
    type: 'MESSAGE',
    permissions: ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'],
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
    opts: { message: 'Hello world' },
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

test('returns false if missing command name', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(NoteCommand.defaultConfig, db);

  expect(NoteCommand.execute(user, [], cmd, db, bot)).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

test('returns false if target command does not exist and modifier is not add', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(NoteCommand.defaultConfig, db);
  db.Command.update(cmd);

  expect(NoteCommand.execute(user, ['enable', 'nonexistent'], cmd, db, bot)).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

test('returns false if fetched command is invalid MessageCommand', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(NoteCommand.defaultConfig, db);

  db.Command.fetchByName = mock(() => ({ id: 2, name: 'x', type: 'NOTE' }) as any);

  expect(NoteCommand.execute(user, ['enable', 'x'], cmd, db, bot)).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

//
// ✅ VALID CASES
//

test('adds a new note if it does not exist', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(NoteCommand.defaultConfig, db);
  db.Command.update(cmd);
  db.Command.createNewMessage = mock((name: string, message: string) => createTargetNote({ name, opts: { message } }));

  const result = NoteCommand.execute(user, ['add', 'newNote', 'Hello world'], cmd, db, bot);

  expect(result).toBe(true);
  expect(db.Command.createNewMessage).toHaveBeenCalledWith('newNote', 'Hello world');
  expect(bot.send).toHaveBeenCalledWith('Tester added the command newNote - Hello world');
});

test('removes a note and sends message', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(NoteCommand.defaultConfig, db);

  const target = createTargetNote();
  db.Command.update(target);

  NoteCommand.execute(user, ['remove', target.name], cmd, db, bot);

  expect(db.Command.deleteById).toHaveBeenCalledWith(cmd.id);
  expect(bot.send).toHaveBeenCalledWith(`Tester removed the command ${target.name} - ${target.opts.message}`);
});

test('enables a note and sends message', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(NoteCommand.defaultConfig, db);

  const target = createTargetNote({ isEnabled: false });
  db.Command.update(target);

  NoteCommand.execute(user, ['enable', target.name], cmd, db, bot);

  expect(db.Command.update).toHaveBeenCalledWith({ ...target, isEnabled: true });
  expect(bot.send).toHaveBeenCalledWith(`Tester enabled the command ${target.name} - ${target.opts.message}`);
});

test('disables a note and sends message', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(NoteCommand.defaultConfig, db);

  const target = createTargetNote({ isEnabled: true });
  db.Command.update(target);

  NoteCommand.execute(user, ['disable', target.name], cmd, db, bot);

  expect(db.Command.update).toHaveBeenCalledWith({ ...target, isEnabled: false });
  expect(bot.send).toHaveBeenCalledWith(`Tester disabled the command ${target.name} - ${target.opts.message}`);
});

test('updates userCd and sends message', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(NoteCommand.defaultConfig, db);

  const target = createTargetNote({ userCd: 0 });
  db.Command.update(target);

  NoteCommand.execute(user, ['ucd', target.name, '30'], cmd, db, bot);

  expect(db.Command.update).toHaveBeenCalledWith({ ...target, userCd: 30 });
  expect(bot.send).toHaveBeenCalledWith(`Tester changed the user CD ${target.name} to 30 seconds`);
});

test('updates globalCd and sends message', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(NoteCommand.defaultConfig, db);

  const target = createTargetNote({ globalCd: 0 });
  db.Command.update(target);

  NoteCommand.execute(user, ['gcd', target.name, '45'], cmd, db, bot);

  expect(db.Command.update).toHaveBeenCalledWith({ ...target, globalCd: 45 });
  expect(bot.send).toHaveBeenCalledWith(`Tester changed the global CD ${target.name} to 45 seconds`);
});

test('sets a new message content and sends message', () => {
  const user = createTestUser(db, {});
  const cmd = createTestCommand(NoteCommand.defaultConfig, db);

  const target = createTargetNote({ opts: { message: 'Old message' } });
  db.Command.update(target);

  NoteCommand.execute(user, ['set', target.name, 'New message'], cmd, db, bot);

  expect(db.Command.update).toHaveBeenCalledWith({
    ...target,
    opts: { message: 'New message' },
  });
  expect(bot.send).toHaveBeenCalledWith(`Tester set the command ${target.name} - New message`);
});

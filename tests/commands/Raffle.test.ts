import { test, expect, beforeEach, mock } from 'bun:test';
import { RaffleCommand } from '../../commands/Raffle';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { RaffleCron } from '../../crons/Raffle';
import { createTestCommand } from '../utils/Command';
import { createTestCron } from '../utils/Cron';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();
});

//
// ❌ INVALID CASES
//

test('returns false for invalid bet amount', () => {
  const user = createTestUser(db, { points: 100 });
  const command = createTestCommand(db, RaffleCommand.defaultConfig);

  createTestCron(db, RaffleCron.defaultConfig);

  const result = RaffleCommand.execute(user, ['0'], command, db, bot);

  expect(result).toBe(false);
  expect(bot.send).toHaveBeenCalled(); // invalidAmount shown
  expect(db.User.addPoints).not.toHaveBeenCalled();
});

test('returns false if bet is higher than user points', () => {
  const user = createTestUser(db, { points: 10 });
  const command = createTestCommand(db, RaffleCommand.defaultConfig);

  createTestCron(db, RaffleCron.defaultConfig);

  const result = RaffleCommand.execute(user, ['50'], command, db, bot);

  expect(result).toBe(false);
  expect(db.User.addPoints).not.toHaveBeenCalled();
});

test('returns false if betting is not opened', () => {
  const user = createTestUser(db, { points: 100 });
  const command = createTestCommand(db, RaffleCommand.defaultConfig);

  createTestCron(db, RaffleCron.defaultConfig, { opts: { isBettingOpened: false, pot: 0, userList: [] } });

  const result = RaffleCommand.execute(user, ['10'], command, db, bot);

  expect(result).toBe(false);
  expect(bot.send).toHaveBeenCalled(); // notOpened message
});

test('returns false if user already bet', () => {
  const user = createTestUser(db, { points: 100 });
  const command = createTestCommand(db, RaffleCommand.defaultConfig);

  createTestCron(db, RaffleCron.defaultConfig, {
    opts: { isBettingOpened: false, pot: 0, userList: [[user.userId, 10]] },
  });

  const result = RaffleCommand.execute(user, ['10'], command, db, bot);

  expect(result).toBe(false);
  expect(bot.send).toHaveBeenCalled(); // alreadyBetted
});

//
// ✅ VALID CASE
//

test('successful bet updates DB and cron correctly', () => {
  const user = createTestUser(db, { points: 100 });
  const command = createTestCommand(db, RaffleCommand.defaultConfig);

  const cron = createTestCron(db, RaffleCron.defaultConfig, {
    opts: { ...RaffleCron.defaultConfig.opts, isBettingOpened: true },
  });

  const result = RaffleCommand.execute(user, ['10'], command, db, bot);

  expect(result).toBe(true);

  // points deducted
  const userData = expect.objectContaining({ userId: user.userId });
  expect(db.User.addPoints).toHaveBeenCalledWith(userData, 10, -10, 'RAFFLE', db.Log);

  // cron updated
  expect(cron.opts.pot).toBe(10);
  expect(cron.opts.userList).toEqual([[user.userId, 10]]);
  expect(db.Cron.update).toHaveBeenCalled();

  // message sent
  expect(bot.send).toHaveBeenCalledWith(`Raffle: ${user.username} placed a bet of 10 coins!`);
});

//
// 🧩 TEMPLATE TEST
//

test('replaces template variables correctly', () => {
  const user = createTestUser(db, { points: 100 });

  const command = createTestCommand(db, RaffleCommand.defaultConfig, {
    opts: {
      ...RaffleCommand.defaultConfig.opts,
      messages: { ...RaffleCommand.defaultConfig.opts.messages, userBetted: '$user bet $bet ($min-$max) $currency' },
    },
  });

  createTestCron(db, RaffleCron.defaultConfig, {
    opts: { ...RaffleCron.defaultConfig.opts, isBettingOpened: true },
  });

  RaffleCommand.execute(user, ['15'], command, db, bot);

  expect(bot.send).toHaveBeenCalledWith(`${user.username} bet 15 (1-100) coins`);
});

//
// 🔍 SIDE EFFECTS
//

test('does not send message if showMessages.userBetted is false', () => {
  const user = createTestUser(db, { points: 100 });

  const command = createTestCommand(db, RaffleCommand.defaultConfig, {
    opts: {
      ...RaffleCommand.defaultConfig.opts,
      showMessages: { ...RaffleCommand.defaultConfig.opts.showMessages, userBetted: false },
    },
  });

  createTestCron(db, RaffleCron.defaultConfig, {
    opts: { ...RaffleCron.defaultConfig.opts, isBettingOpened: true },
  });

  RaffleCommand.execute(user, ['10'], command, db, bot);

  expect(bot.send).not.toHaveBeenCalled();
});

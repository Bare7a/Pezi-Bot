import { test, expect, beforeEach, mock } from 'bun:test';
import { RaffleCron } from '../../crons/Raffle';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { env } from '../../utils/Config';
import { RaffleCommand } from '../../commands/Raffle';
import { createTestCron } from '../utils/Cron';
import { StatusCron } from '../../crons/Status';
import { createTestCommand } from '../utils/Command';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();
  env.botCurrencyName = 'coins';
});

//
// ❌ INVALID CASES
//

test('returns false if raffle command does not exist', async () => {
  const result = await RaffleCron.execute(db, bot);

  expect(result).toBe(false);
});

test('returns false if execution is not permitted', async () => {
  createTestCron(db, RaffleCron.defaultConfig, { callAt: new Date(new Date().getDate() + 1) });
  createTestCron(db, StatusCron.defaultConfig);
  createTestCommand(db, RaffleCommand.defaultConfig);

  const result = await RaffleCron.execute(db, bot);

  expect(result).toBe(false);
});

test('returns false if command is disabled', async () => {
  createTestCron(db, RaffleCron.defaultConfig, { isEnabled: false });
  createTestCron(db, StatusCron.defaultConfig);
  createTestCommand(db, RaffleCommand.defaultConfig);

  const result = await RaffleCron.execute(db, bot);

  expect(result).toBe(false);
});

test('returns false if onlyOnline is true and stream is offline', async () => {
  createTestCron(db, RaffleCron.defaultConfig);
  createTestCron(db, StatusCron.defaultConfig, { opts: { isOnline: false } });
  createTestCommand(db, RaffleCommand.defaultConfig, { onlyOnline: true });

  const result = await RaffleCron.execute(db, bot);

  expect(result).toBe(false);
});

//
// ✅ VALID CASES
//

test('starts betting when betting is closed', async () => {
  const raffleCron = createTestCron(db, RaffleCron.defaultConfig, {
    opts: { isBettingOpened: false, pot: 0, userList: [] },
  });
  createTestCron(db, StatusCron.defaultConfig);
  createTestCommand(db, RaffleCommand.defaultConfig, { onlyOnline: false });

  const result = await RaffleCron.execute(db, bot);

  expect(result).toBe(true);
  expect(raffleCron.opts.isBettingOpened).toBe(true);
  expect(bot.send).toHaveBeenCalledWith('Raffle: Started, you can bet by typing !raffle <1 - 100>');
});

test('picks winner and rewards points', async () => {
  const user = createTestUser(db, { userId: 'u1', username: 'winner' });

  createTestCron(db, RaffleCron.defaultConfig, { opts: { isBettingOpened: true, pot: 100, userList: [['u1', 100]] } });
  createTestCron(db, StatusCron.defaultConfig);
  createTestCommand(db, RaffleCommand.defaultConfig, { onlyOnline: false });

  db.User.getById = mock(() => user);

  const result = await RaffleCron.execute(db, bot);
  const userData = expect.objectContaining({ userId: 'u1' });

  expect(result).toBe(true);
  expect(db.User.addPoints).toHaveBeenCalledWith(userData, 0, 100, 'RAFFLE', db.Log);
  expect(bot.send).toHaveBeenCalledWith('Raffle: winner won 100 coins!');
});

test('handles no bets case', async () => {
  createTestCron(db, RaffleCron.defaultConfig, { opts: { isBettingOpened: true, pot: 0, userList: [] } });
  createTestCron(db, StatusCron.defaultConfig);
  createTestCommand(db, RaffleCommand.defaultConfig, { onlyOnline: false });

  const result = await RaffleCron.execute(db, bot);

  expect(result).toBe(true);
  expect(bot.send).toHaveBeenCalledWith('Raffle: Nobody placed a bet!');
});

test('resets raffle state after execution', async () => {
  const raffleCron = createTestCron(db, RaffleCron.defaultConfig, {
    opts: { isBettingOpened: true, pot: 50, userList: [['u1', 50]] },
  });
  createTestCron(db, StatusCron.defaultConfig);
  createTestCommand(db, RaffleCommand.defaultConfig, { onlyOnline: false });

  await RaffleCron.execute(db, bot);

  expect(raffleCron.opts.pot).toBe(0);
  expect(raffleCron.opts.userList).toEqual([]);
  expect(raffleCron.opts.isBettingOpened).toBe(false);
});

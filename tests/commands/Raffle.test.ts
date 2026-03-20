import { test, expect, beforeEach, mock } from 'bun:test';
import { RaffleCommand } from '../../commands/Raffle';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { Command, IRaffleCommand } from '../../types/models/Command';
import { RaffleCronType, Cron } from '../../types/models/Cron';
import { RaffleCron } from '../../crons/Raffle';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();
});

const createTestRaffleCommand = (overrides?: Partial<Command<IRaffleCommand>>): Command<IRaffleCommand> => {
  return {
    ...RaffleCommand.defaultConfig,
    id: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
    opts: {
      ...RaffleCommand.defaultConfig.opts,
      ...(overrides?.opts ?? {}),
    },
  };
};

const setupRaffleCron = (overrides?: Partial<RaffleCronType>): Cron<RaffleCronType> => {
  const cron: Cron<RaffleCronType> = {
    ...RaffleCron.defaultConfig,
    id: 1,
    type: 'RAFFLE',
    interval: 0,
    isEnabled: true,
    isExecuting: false,
    isLogEnabled: true,
    lastCalledAt: new Date(0),
    callAt: new Date(0),
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
    opts: {
      ...RaffleCron.defaultConfig.opts,
      pot: 0,
      userList: [],
      isBettingOpened: true,
      ...(overrides?.opts ?? {}),
    },
  };

  db.Cron.fetch = mock(() => cron);
  db.Cron.update = mock(() => cron);

  return cron;
};

//
// ❌ INVALID CASES
//

test('returns false for invalid bet amount', () => {
  const user = createTestUser({ points: 100 }, db);
  const command = createTestRaffleCommand();

  setupRaffleCron();

  const result = RaffleCommand.execute(user, ['0'], command, db, bot);

  expect(result).toBe(false);
  expect(bot.send).toHaveBeenCalled(); // invalidAmount shown
  expect(db.User.addPoints).not.toHaveBeenCalled();
});

test('returns false if bet is higher than user points', () => {
  const user = createTestUser({ points: 10 }, db);
  const command = createTestRaffleCommand();

  setupRaffleCron();

  const result = RaffleCommand.execute(user, ['50'], command, db, bot);

  expect(result).toBe(false);
  expect(db.User.addPoints).not.toHaveBeenCalled();
});

test('returns false if betting is not opened', () => {
  const user = createTestUser({ points: 100 }, db);
  const command = createTestRaffleCommand();

  setupRaffleCron({ opts: { isBettingOpened: false, pot: 0, userList: [] } });

  const result = RaffleCommand.execute(user, ['10'], command, db, bot);

  expect(result).toBe(false);
  expect(bot.send).toHaveBeenCalled(); // notOpened message
});

test('returns false if user already bet', () => {
  const user = createTestUser({ points: 100 }, db);
  const command = createTestRaffleCommand();

  setupRaffleCron({ opts: { isBettingOpened: false, pot: 0, userList: [[user.userId, 10]] } });

  const result = RaffleCommand.execute(user, ['10'], command, db, bot);

  expect(result).toBe(false);
  expect(bot.send).toHaveBeenCalled(); // alreadyBetted
});

//
// ✅ VALID CASE
//

test('successful bet updates DB and cron correctly', () => {
  const user = createTestUser({ points: 100 }, db);
  const command = createTestRaffleCommand();

  const cron = setupRaffleCron();

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
  const user = createTestUser({ points: 100 }, db);

  const command = createTestRaffleCommand({
    opts: {
      ...RaffleCommand.defaultConfig.opts,
      messages: { ...RaffleCommand.defaultConfig.opts.messages, userBetted: '$user bet $bet ($min-$max) $currency' },
    },
  });

  setupRaffleCron();

  RaffleCommand.execute(user, ['15'], command, db, bot);

  expect(bot.send).toHaveBeenCalledWith(`${user.username} bet 15 (1-100) coins`);
});

//
// 🔍 SIDE EFFECTS
//

test('does not send message if showMessages.userBetted is false', () => {
  const user = createTestUser({ points: 100 }, db);

  const command = createTestRaffleCommand({
    opts: {
      ...RaffleCommand.defaultConfig.opts,
      showMessages: {
        ...RaffleCommand.defaultConfig.opts.showMessages,
        userBetted: false,
      },
    },
  });

  setupRaffleCron();

  RaffleCommand.execute(user, ['10'], command, db, bot);

  expect(bot.send).not.toHaveBeenCalled();
});

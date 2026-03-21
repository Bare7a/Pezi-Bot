import { test, expect, beforeEach, mock } from 'bun:test';
import { StatsCommand } from '../../commands/Stats';
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

const createUserBets = (db: ReturnType<typeof createMockDb>, userBets: { cost: number; points: number }[]) =>
  db.Log.insertBulk(
    userBets.map(({ cost, points }) => ({
      id: 1,
      cost,
      points,
      userId: 'tester',
      type: 'SLOTS',
      allPoints: 15,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );

//
// ❌ EDGE CASES
//

test('handles no logs (zero stake and profit)', () => {
  const user = createTestUser(db, {});
  const command = createTestCommand(db, StatsCommand.defaultConfig);

  db.Log.getUserBets = mock(() => []);

  StatsCommand.execute(user, [], command, db, bot);

  expect(bot.send).toHaveBeenCalledWith(
    `${user.username} with all your stakes of 0 coins you are ahead with 0 coins SeemsGood`,
  );
});

//
// ✅ POSITIVE CASE
//

test('sends positive message when profit >= 0', () => {
  const user = createTestUser(db, {});
  const command = createTestCommand(db, StatsCommand.defaultConfig);

  createUserBets(db, [
    { cost: 10, points: 5 },
    { cost: 20, points: 15 },
  ]);

  StatsCommand.execute(user, [], command, db, bot);

  // stake = 30, profit = 20
  expect(bot.send).toHaveBeenCalledWith(
    `${user.username} with all your stakes of 30 coins you are ahead with 20 coins SeemsGood`,
  );
});

//
// ❌ NEGATIVE CASE
//

test('sends negative message when profit < 0', () => {
  const user = createTestUser(db, {});
  const command = createTestCommand(db, StatsCommand.defaultConfig);

  createUserBets(db, [
    { cost: 10, points: -5 },
    { cost: 20, points: -10 },
  ]);

  StatsCommand.execute(user, [], command, db, bot);

  // stake = 30, profit = -15
  expect(bot.send).toHaveBeenCalledWith(
    `${user.username} with all your stakes of 30 coins you are behind with -15 coins LUL`,
  );
});

//
// 🧩 TEMPLATE TEST
//

test('replaces template variables correctly', () => {
  const user = createTestUser(db, {});

  const command = createTestCommand(db, StatsCommand.defaultConfig, {
    opts: {
      messages: {
        positive: '$user profit: $profit / stake: $stake $currency',
        negative: 'bad',
      },
    },
  });

  createUserBets(db, [{ cost: 50, points: 25 }]);

  StatsCommand.execute(user, [], command, db, bot);

  expect(bot.send).toHaveBeenCalledWith(`${user.username} profit: 25 / stake: 50 coins`);
});

//
// 🔍 AGGREGATION CHECK
//

test('correctly aggregates multiple logs', () => {
  const user = createTestUser(db, {});
  const command = createTestCommand(db, StatsCommand.defaultConfig);

  createUserBets(db, [
    { cost: 10, points: -5 },
    { cost: 15, points: 10 },
    { cost: 5, points: -2 },
  ]);

  StatsCommand.execute(user, [], command, db, bot);

  // stake = 30, profit = 3
  expect(bot.send).toHaveBeenCalledWith(
    `${user.username} with all your stakes of 30 coins you are ahead with 3 coins SeemsGood`,
  );
});

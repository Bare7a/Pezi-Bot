import { test, expect, beforeEach, mock, beforeAll, afterAll } from 'bun:test';
import { TriviaCron } from '../../crons/Trivia';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestCron } from '../utils/Cron';
import { TriviaCommand } from '../../commands/Trivia';
import { StatusCron } from '../../crons/Status';
import { createTestCommand } from '../utils/Command';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;
let originalRandom: typeof Math.random;

beforeAll(() => {
  originalRandom = Math.random;
});

afterAll(() => {
  Math.random = originalRandom;
});

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();
});

//
// ❌ INVALID CASES
//

test('returns false if trivia command does not exist', async () => {
  createTestCron(db, TriviaCron.defaultConfig);
  createTestCron(db, StatusCron.defaultConfig, { opts: { isOnline: true } });

  const result = await TriviaCron.execute(db, bot);
  expect(result).toBe(false);
});

test('returns false if execution is not permitted', async () => {
  createTestCron(db, TriviaCron.defaultConfig, { callAt: new Date(Date.now() + 100000) });
  createTestCron(db, StatusCron.defaultConfig, { opts: { isOnline: true } });

  const result = await TriviaCron.execute(db, bot);
  expect(result).toBe(false);
});

test('returns false if command is disabled', async () => {
  createTestCron(db, TriviaCron.defaultConfig);
  createTestCron(db, StatusCron.defaultConfig, { opts: { isOnline: true } });
  createTestCommand(db, TriviaCommand.defaultConfig, { isEnabled: false });

  const result = await TriviaCron.execute(db, bot);
  expect(result).toBe(false);
});

test('returns false if onlyOnline is true and stream is offline', async () => {
  createTestCron(db, TriviaCron.defaultConfig);
  createTestCron(db, StatusCron.defaultConfig, { opts: { isOnline: false } });
  createTestCommand(db, TriviaCommand.defaultConfig, { onlyOnline: true });

  const result = await TriviaCron.execute(db, bot);
  expect(result).toBe(false);
});

//
// ✅ VALID CASES
//

test('selects a new trivia question and announces previous answer', async () => {
  Math.random = mock(() => 0.2);
  const triviaCron = createTestCron(db, TriviaCron.defaultConfig, {
    opts: {
      question: "What's two plus two?",
      answers: ['four', '4'],
      prize: 15,
      previousQuestions: { "What's two plus two?": true },
    },
  });

  createTestCron(db, StatusCron.defaultConfig, { opts: { isOnline: true } });
  createTestCommand(db, TriviaCommand.defaultConfig);

  const result = await TriviaCron.execute(db, bot);
  expect(result).toBe(true);

  // Cron should have a new question
  expect(triviaCron.opts.question).not.toBe("What's two plus two?");
  expect(triviaCron.opts.answers?.length).toBeGreaterThan(0);
  expect(triviaCron.opts.prize).toBeGreaterThanOrEqual(TriviaCommand.defaultConfig.opts.minReward);
  expect(triviaCron.opts.prize).toBeLessThanOrEqual(TriviaCommand.defaultConfig.opts.maxReward);

  // Cron state
  expect(triviaCron.isExecuting).toBe(false);
  expect(triviaCron.callAt.getTime()).toBeGreaterThan(triviaCron.lastCalledAt.getTime());

  // Bot messages
  expect(bot.send).toHaveBeenCalledWith(`The right answer for "What's two plus two?" was four and 4`);
  expect(bot.send).toHaveBeenCalledWith('Win 12 coins by answering: What color is the grass?');
});

test('resets previous questions when all questions have been used', async () => {
  const allQuestions = TriviaCommand.defaultConfig.opts.questions;
  const previousQuestions = Object.fromEntries(allQuestions.map(([q]) => [q, true])) as any;
  const triviaCron = createTestCron(db, TriviaCron.defaultConfig, { opts: { previousQuestions } });

  createTestCron(db, StatusCron.defaultConfig, { opts: { isOnline: true } });
  createTestCommand(db, TriviaCommand.defaultConfig);

  const result = await TriviaCron.execute(db, bot);
  expect(result).toBe(true);

  // Previous questions map should reset to only contain the new question
  expect(Object.keys(triviaCron.opts.previousQuestions).length).toBe(1);
  expect(triviaCron.opts.question).not.toBeUndefined();
});

test('sends only new question message if no previous question exists', async () => {
  createTestCron(db, TriviaCron.defaultConfig, { opts: { previousQuestions: {} } });

  createTestCron(db, StatusCron.defaultConfig, { opts: { isOnline: true } });
  createTestCommand(db, TriviaCommand.defaultConfig);

  const result = await TriviaCron.execute(db, bot);
  expect(result).toBe(true);

  // Only new question message should be sent
  expect(bot.send).toHaveBeenCalledTimes(1);
  expect(bot.send).toHaveBeenCalledWith(expect.stringContaining('Win'));
});

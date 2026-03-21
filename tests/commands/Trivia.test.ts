import { test, expect, beforeEach, mock } from 'bun:test';
import { env } from '../../utils/Config';
import { TriviaCommand } from '../../commands/Trivia';
import { createMockDb } from '../utils/Db';
import { createMockBot } from '../utils/Twitch';
import { createTestUser } from '../utils/User';
import { Cron, TriviaCronType } from '../../types/models/Cron';
import { TriviaCron } from '../../crons/Trivia';
import { createTestCommand } from '../utils/Command';

let db: ReturnType<typeof createMockDb>;
let bot: ReturnType<typeof createMockBot>;

beforeEach(() => {
  db = createMockDb();
  bot = createMockBot();

  env.botCurrencyName = 'coins';
});

const setupTriviaCron = (overrides?: Partial<TriviaCronType>): Cron<TriviaCronType> => {
  const cron: Cron<TriviaCronType> = {
    ...TriviaCron.defaultConfig,
    id: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
    opts: {
      ...TriviaCron.defaultConfig.opts,
      question: "What's two plus two?",
      answers: ['four', '4'],
      prize: 20,
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

test('returns false if user has insufficient points', () => {
  const user = createTestUser(db, { points: 0 });
  const command = createTestCommand(db, TriviaCommand.defaultConfig, { cost: 10 });

  const result = TriviaCommand.execute(user, ['4'], command, db, bot);

  expect(result).toBe(false);
  expect(bot.send).not.toHaveBeenCalled();
});

test('returns false if trivia is not ready', () => {
  const user = createTestUser(db, {});
  const command = createTestCommand(db, TriviaCommand.defaultConfig);

  setupTriviaCron({ opts: { question: undefined, answers: undefined, prize: undefined, previousQuestions: {} } });

  const result = TriviaCommand.execute(user, ['4'], command, db, bot);

  expect(result).toBe(false);
  expect(bot.send).toHaveBeenCalledWith(`${user.username} the trivia is not ready yet!`);
});

//
// ✅ WINNING CASE
//

test('correct answer rewards user and sends message', () => {
  const user = createTestUser(db, { points: 100 });
  const command = createTestCommand(db, TriviaCommand.defaultConfig);

  const cron = setupTriviaCron();

  TriviaCommand.execute(user, ['4'], command, db, bot);

  const userData = expect.objectContaining({ userId: user.userId });
  expect(db.User.addPoints).toHaveBeenCalledWith(userData, 0, 20, 'TRIVIA', db.Log);

  expect(bot.send).toHaveBeenCalledWith(`${user.username} answered the question first - 4 and won 20 coins!`);

  // cron reset
  expect(cron.opts.question).toBeUndefined();
  expect(cron.opts.answers).toBeUndefined();
  expect(cron.opts.prize).toBeUndefined();
  expect(db.Cron.update).toHaveBeenCalled();
});

//
// ❌ LOSING CASE
//

test('wrong answer deducts cost and sends message', () => {
  const user = createTestUser(db, { points: 100 });
  const command = createTestCommand(db, TriviaCommand.defaultConfig, { cost: 10 });

  setupTriviaCron();

  TriviaCommand.execute(user, ['wrong'], command, db, bot);

  const userData = expect.objectContaining({ userId: user.userId });
  expect(db.User.addPoints).toHaveBeenCalledWith(userData, 10, -10, 'TRIVIA', db.Log);

  expect(bot.send).toHaveBeenCalledWith(`${user.username} gave the wrong answer - wrong and lost 10 coins!`);
});

test('does not send message when losing and showMessages.lost = false', () => {
  const user = createTestUser(db, { points: 100 });

  const command = createTestCommand(db, TriviaCommand.defaultConfig, {
    opts: {
      ...TriviaCommand.defaultConfig.opts,
      showMessages: {
        ...TriviaCommand.defaultConfig.opts.showMessages,
        lost: false,
      },
    },
  });

  setupTriviaCron();

  TriviaCommand.execute(user, ['wrong'], command, db, bot);

  expect(bot.send).not.toHaveBeenCalled();
});

//
// 🧩 TEMPLATE TEST
//

test('replaces template variables correctly', () => {
  const user = createTestUser(db, {});

  const command = createTestCommand(db, TriviaCommand.defaultConfig, {
    opts: {
      ...TriviaCommand.defaultConfig.opts,
      messages: {
        ...TriviaCommand.defaultConfig.opts.messages,
        won: '$user got "$answerUser" correct for "$question" and won $reward $currency',
      },
    },
  });

  setupTriviaCron({ opts: { question: 'Capital of France?', answers: ['paris'], prize: 50, previousQuestions: {} } });

  TriviaCommand.execute(user, ['paris'], command, db, bot);

  expect(bot.send).toHaveBeenCalledWith(
    `${user.username} got "paris" correct for "Capital of France?" and won 50 coins`,
  );
});

//
// 🔍 CRON INTERVAL BEHAVIOR
//

test('uses fixed interval when newQuestionOnAnswer is true', () => {
  const user = createTestUser(db, {});

  const command = createTestCommand(db, TriviaCommand.defaultConfig, {
    opts: {
      ...TriviaCommand.defaultConfig.opts,
      newQuestionOnAnswer: true,
    },
  });

  const cron = setupTriviaCron();

  TriviaCommand.execute(user, ['4'], command, db, bot);

  expect(db.Cron.getCallAtDate).toHaveBeenCalledWith(cron, 10);
});

test('uses random interval when newQuestionOnAnswer is false', () => {
  const user = createTestUser(db, {});

  const command = createTestCommand(db, TriviaCommand.defaultConfig, {
    opts: {
      ...TriviaCommand.defaultConfig.opts,
      newQuestionOnAnswer: false,
      minQuestionInterval: 100,
      maxQuestionInterval: 200,
    },
  });

  setupTriviaCron();

  TriviaCommand.execute(user, ['4'], command, db, bot);
  expect(db.Cron.getCallAtDate).toHaveBeenCalled();
});

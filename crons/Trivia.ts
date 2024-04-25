import { env } from '../utils/Config';
import { TwitchActions } from '../types/utils/Twitch';
import { ITriviaCommand } from '../types/models/Command';
import { CronActionType, isTriviaCron, DbActions } from '../types/utils/DB';
import { TriviaCronType, Cron, ICron, StatusCronType } from '../types/models/Cron';

export const TriviaCron: CronActionType<TriviaCronType> = {
  isValid: (cron: Cron<ICron>): cron is Cron<TriviaCronType> => isTriviaCron(cron),
  execute: async function (db: DbActions, bot: TwitchActions): Promise<boolean> {
    try {
      const triviaCommand = db.Command.fetch<ITriviaCommand>('TRIVIA');
      const triviaCron = db.Cron.fetch<TriviaCronType>('TRIVIA');
      const statusCron = db.Cron.fetch<StatusCronType>('STATUS');
      if (!triviaCommand) return false;

      const { isEnabled, onlyOnline } = triviaCommand;
      const { minReward, maxReward, minQuestionInterval, maxQuestionInterval, questions } = triviaCommand.opts;
      const { messages, showMessages } = triviaCommand.opts;
      const { question: oldQuestion, answers: oldAnswers, prize: oldPrize } = triviaCron.opts;

      const isExecutionTime = db.Cron.isExecutePermited(triviaCron);
      const isCommandEnabled = isEnabled && (!onlyOnline || statusCron.opts.isOnline);

      if (!isExecutionTime || !isCommandEnabled) return false;

      triviaCron.isExecuting = true;
      db.Cron.update<TriviaCronType>('TRIVIA', triviaCron);

      let newQuestions = questions.filter((question) => !triviaCron.opts.previousQuestions[question[0]]);
      if (newQuestions.length === 0) {
        newQuestions = questions;
        triviaCron.opts.previousQuestions = {};
      }

      const [newQuestion, newAnswers] = newQuestions[Math.floor(Math.random() * newQuestions.length)];
      const prize = Math.floor(Math.random() * (maxReward - minReward + 1) + minReward);
      const interval = Math.random() * (maxQuestionInterval - minQuestionInterval + 1) + minQuestionInterval;
      const currencyName = env.botCurrencyName;

      triviaCron.opts.prize = prize;
      triviaCron.opts.answers = newAnswers;
      triviaCron.opts.question = newQuestion;
      triviaCron.opts.previousQuestions[newQuestion] = true;
      triviaCron.callAt = db.Cron.getCallAtDate(triviaCron, interval);
      triviaCron.lastCalledAt = new Date();
      triviaCron.isExecuting = false;
      db.Cron.update<TriviaCronType>('TRIVIA', triviaCron);

      if (showMessages.rightAnswer && oldQuestion && oldAnswers && oldPrize) {
        const message = messages.rightAnswer
          .replaceAll('$reward', oldPrize.toString())
          .replaceAll('$currency', currencyName)
          .replaceAll('$answers', oldAnswers.join(' and '))
          .replaceAll('$question', oldQuestion);
        bot.send(message);
      }

      const message = messages.newQuestion
        .replaceAll('$reward', prize.toString())
        .replaceAll('$currency', currencyName)
        .replaceAll('$question', newQuestion);
      bot.send(message);

      return true;
    } catch (ex) {
      console.log(`There was an error while running updateTriviaQuestion`);
      console.log(ex);

      return false;
    }
  },
  defaultConfig: {
    type: 'TRIVIA',
    interval: 0,
    isEnabled: true,
    isExecuting: false,
    isLogEnabled: true,
    lastCalledAt: new Date(0),
    callAt: new Date(0),
    opts: {
      previousQuestions: {},
    },
  },
};

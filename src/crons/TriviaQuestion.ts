import { Command, Cron } from '../db';
import { CONFIG, TwitchClient } from '../utils';
import { ITriviaCommand, StatusCronType, TriviaCronType } from '../types';

export const updateTriviaQuestion = async (bot: TwitchClient) => {
  try {
    const [triviaCron, triviaCommand, statusCron] = await Promise.all([
      Cron.fetch<TriviaCronType>('TRIVIA'),
      Command.fetch<ITriviaCommand>('TRIVIA'),
      Cron.fetch<StatusCronType>('STATUS'),
    ]);

    const { isEnabled, onlyOnline } = triviaCommand;
    const { minReward, maxReward, minQuestionInterval, maxQuestionInterval, questions } = triviaCommand.opts;
    const { messages, showMessages } = triviaCommand.opts;
    const { question: oldQuestion, answers: oldAnswers, prize: oldPrize } = triviaCron.opts;

    const isExecutionTime = triviaCron.isExecutePermited();
    const isCommandEnabled = isEnabled && (!onlyOnline || statusCron.opts.isOnline);

    if (!isExecutionTime || !isCommandEnabled) return false;

    triviaCron.isExecuting = true;
    await triviaCron.save();

    let newQuestions = questions.filter((question) => !triviaCron.opts.previousQuestions[question[0]]);
    if (newQuestions.length === 0) {
      newQuestions = questions;
      triviaCron.opts.previousQuestions = {};
    }

    const [newQuestion, newAnswers] = newQuestions[Math.floor(Math.random() * newQuestions.length)];
    const prize = Math.floor(Math.random() * (maxReward - minReward + 1) + minReward);
    const interval = Math.random() * (maxQuestionInterval - minQuestionInterval + 1) + minQuestionInterval;
    const currencyName = CONFIG.currencyName;

    triviaCron.opts.prize = prize;
    triviaCron.opts.answers = newAnswers;
    triviaCron.opts.question = newQuestion;
    triviaCron.opts.previousQuestions[newQuestion] = true;
    triviaCron.callAt = triviaCron.getCallAtDate(interval);
    triviaCron.lastCalledAt = new Date();
    triviaCron.isExecuting = false;

    triviaCron.changed('opts', true);
    await triviaCron.save();

    if (showMessages.rightAnswer && oldQuestion && oldAnswers && oldPrize) {
      const message = messages.rightAnswer
        .replaceAll('$reward', oldPrize.toString())
        .replaceAll('$currency', currencyName)
        .replaceAll('$answers', oldAnswers.join(' and '))
        .replaceAll('$question', oldQuestion);
      await bot.send(message);
    }

    const message = messages.newQuestion
      .replaceAll('$reward', prize.toString())
      .replaceAll('$currency', currencyName)
      .replaceAll('$question', newQuestion);
    await bot.send(message);

    return true;
  } catch (ex) {
    console.log(`There was an error while running updateTriviaQuestion`);
    console.log(ex);

    return false;
  }
};

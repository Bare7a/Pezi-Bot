import { ITriviaCommand, TriviaCronType, isTriviaCommand } from '@pezi-bot/shared';

import { CONFIG } from '../utils/Config';
import { Command } from '../models/Command';
import { Cron } from '../models/Cron';
import { CommandActionType } from '../types/Command';

export const TriviaCommand: CommandActionType<ITriviaCommand> = {
  defaultConfig: {
    name: '!answer',
    type: 'TRIVIA',
    cost: 0,
    customCost: false,
    userCd: 0,
    globalCd: 0,
    cdMessage: '$user You can use $command after $cd seconds!',
    showCdMessage: false,
    isEnabled: true,
    onlyOnline: true,
    permission: ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'],
    lastCalledAt: new Date(0),
    isLogEnabled: true,
    opts: {
      minReward: 10,
      maxReward: 20,
      minQuestionInterval: 600,
      maxQuestionInterval: 1200,
      newQuestionOnAnswer: false,
      questions: [
        ["What's two plus two?", ['four', '4']],
        ['What color is the grass?', ['green']],
      ],
      messages: {
        won: '$user answered the question first - $answerUser and won $reward $currency!',
        lost: '$user gave the wrong answer - $answerUser and lost $cost $currency!',
        notReady: '$user the trivia is not ready yet!',
        newQuestion: 'Win $reward $currency by answering: $question',
        rightAnswer: 'The right answer for "$question" was $answers',
      },
      showMessages: {
        lost: true,
        notReady: true,
        rightAnswer: true,
      },
    },
  },
  isValid: (command): command is Command<ITriviaCommand> => isTriviaCommand(command),
  execute: async (user, params, command, bot) => {
    const cost = command.cost;
    const currencyName = CONFIG.currencyName;

    if (cost > user.points) return false;

    const triviaCron = await Cron.fetch<TriviaCronType>('TRIVIA');
    const { question, answers, prize } = triviaCron.opts;
    const { messages, showMessages } = command.opts;
    const { minQuestionInterval, maxQuestionInterval, newQuestionOnAnswer } = command.opts;

    if (!question || !answers || !prize) {
      if (showMessages.notReady) {
        const message = messages.notReady.replaceAll('$user', user.username);
        bot.send(message);
      }
      return false;
    }

    const answerUser = params.join(' ').trim();
    const isWinning = answers.some((answer) => answer.toLowerCase() === answerUser.toLowerCase());
    const reward = isWinning ? prize : 0;
    const points = reward - cost;

    const questionInterval = Math.random() * (maxQuestionInterval - minQuestionInterval + 1) + minQuestionInterval;
    const interval = newQuestionOnAnswer ? 10 : questionInterval;

    triviaCron.opts.prize = undefined;
    triviaCron.opts.answers = undefined;
    triviaCron.opts.question = undefined;
    triviaCron.lastCalledAt = new Date();
    triviaCron.callAt = triviaCron.getCallAtDate(interval);

    triviaCron.changed('opts', true);
    await triviaCron.save();

    await user.addPoints(cost, points, command.type, command.isLogEnabled);

    if (isWinning || showMessages.lost) {
      let message = isWinning ? messages.won : messages.lost;
      message = message
        .replaceAll('$user', user.username)
        .replaceAll('$cost', cost.toString())
        .replaceAll('$reward', reward.toString())
        .replaceAll('$currency', currencyName)
        .replaceAll('$answerUser', answerUser)
        .replaceAll('$answers', answers.join(' and '))
        .replaceAll('$question', question);

      await bot.send(message);
    }

    return true;
  },
};

import { env } from '../utils/Config';
import { CommandActionType, isRaffleCommand } from '../types/utils';
import { RaffleCronType, IRaffleCommand, Command } from '../types/models';

export const RaffleCommand: CommandActionType<IRaffleCommand> = {
  isValid: (command): command is Command<IRaffleCommand> => isRaffleCommand(command),
  execute: (user, params, command, db, bot): boolean => {
    const getMessageInfo = (message: string) =>
      message
        .replaceAll('$user', user.username)
        .replaceAll('$bet', bet.toString())
        .replaceAll('$min', minBet.toString())
        .replaceAll('$max', maxBet.toString())
        .replaceAll('$points', user.points.toString())
        .replaceAll('$prevBet', prevBet.toString())
        .replaceAll('$command', command.name)
        .replaceAll('$currency', env.botCurrencyName);

    const bet = Number(params[0] ?? command.cost);
    const points = -bet;
    const minCost = command.opts.minBet;
    const maxCost = command.opts.maxBet;
    let prevBet = bet;

    const { messages, showMessages, minBet, maxBet } = command.opts;

    if (bet < minCost || bet > maxCost || bet > user.points || bet <= 0) {
      if (showMessages.invalidAmount) {
        const message = getMessageInfo(messages.invalidAmount);
        bot.send(message);
      }

      return false;
    }

    const raffleCron = db.Cron.fetch<RaffleCronType>('RAFFLE');
    const { userList, isBettingOpened } = raffleCron.opts;

    if (!isBettingOpened) {
      if (showMessages.notOpened) {
        const message = getMessageInfo(messages.notOpened);
        bot.send(message);
      }

      return false;
    }

    const userBet = userList.find((u) => u[0] === user.userId);
    if (userBet) {
      if (showMessages.alreadyBetted) {
        prevBet = userBet[1];
        const message = getMessageInfo(messages.alreadyBetted);
        bot.send(message);
      }

      return false;
    }

    const Log = command.isLogEnabled ? db.Log : undefined;
    db.User.addPoints(user, bet, points, command.type, Log);

    raffleCron.opts.pot += bet;
    raffleCron.opts.userList.push([user.userId, raffleCron.opts.pot]);
    db.Cron.update('RAFFLE', raffleCron);

    if (showMessages.userBetted) {
      const message = getMessageInfo(messages.userBetted);
      bot.send(message);
    }

    return true;
  },
  defaultConfig: {
    name: '!raffle',
    type: 'RAFFLE',
    cost: 10,
    customCost: true,
    userCd: 0,
    globalCd: 0,
    cdMessage: '$user You can use $command after $cd seconds!',
    showCdMessage: false,
    isEnabled: true,
    onlyOnline: true,
    permissions: ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'],
    lastCalledAt: new Date(0),
    isLogEnabled: true,
    opts: {
      minBet: 1,
      maxBet: 100,
      betCountdown: 300,
      startCountdown: 1800,
      messages: {
        noBets: 'Raffle: Nobody placed a bet!',
        userWon: 'Raffle: $user won $win $currency!',
        started: 'Raffle: Started, you can bet by typing $command <$min - $max>',
        notOpened: "Raffle: Bet placing isn't opened yet!",
        userBetted: 'Raffle: $user placed a bet of $bet $currency!',
        invalidAmount: 'Raffle: $user you can bet between $min - $max $currency. Currently you have $points $currency.',
        alreadyBetted: 'Raffle: $user you already placed your bet of $prevBet $currency!',
      },
      showMessages: {
        noBets: true,
        notOpened: true,
        userBetted: true,
        invalidAmount: true,
        alreadyBetted: true,
      },
    },
  },
};

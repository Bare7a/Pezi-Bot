import { ISlotCommand, isSlotCommand } from '@pezi-bot/shared';

import { CONFIG } from '../utils/Config';
import { Command } from '../models/Command';
import { CommandActionType } from '../types/Command';

export const SlotCommand: CommandActionType<ISlotCommand> = {
  defaultConfig: {
    name: '!slot',
    type: 'SLOT',
    cost: 10,
    customCost: true,
    userCd: 1800,
    globalCd: 1200,
    cdMessage: '$user You can use $command after $cd seconds!',
    showCdMessage: false,
    isEnabled: true,
    onlyOnline: true,
    permission: ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'],
    lastCalledAt: new Date(0),
    isLogEnabled: true,
    opts: {
      multiS: 2,
      multiM: 4,
      multiL: 30,
      multiJ: 300,
      emoteList: ['CurseLit', 'FootBall', 'MorphinTime', 'duDudu', 'PopCorn', 'TwitchSings'],
      superEmote: 'FootGoal',
      messages: {
        wonS: '$user pulled the lever [ $slots ] and won (x$multiplier) $reward $currency! PogChamp',
        wonM: '$user pulled the lever [ $slots ] and won (x$multiplier) $reward $currency! Kreygasm',
        wonL: '$user pulled the lever [ $slots ] and won (x$multiplier) $reward $currency! Kappa',
        wonJ: '$user pulled the lever [ $slots ] and won (x$multiplier) $reward $currency! KappaPride',
        lost: '$user pulled the lever [ $slots ] and lost $cost $currency LUL',
      },
    },
  },
  isValid: (command): command is Command<ISlotCommand> => isSlotCommand(command),
  execute: async (user, params, command, bot) => {
    const cost = command.getCost(params[0], user);
    const currencyName = CONFIG.currencyName;

    if (cost > user.points || cost <= 0) return false;

    const emotes = [...command.opts.emoteList, command.opts.superEmote];
    const emotesCount = emotes.length;

    const slots = [
      emotes[Math.floor(Math.random() * emotesCount)],
      emotes[Math.floor(Math.random() * emotesCount)],
      emotes[Math.floor(Math.random() * emotesCount)],
    ];
    const slotsStr = slots.join(' ');

    let message;
    let multiplier = 0;
    let isWinning = true;

    if (slots[0] === slots[1] && slots[1] === slots[2] && slots[0] === command.opts.superEmote) {
      multiplier = command.opts.multiJ;
      message = command.opts.messages.wonJ;
    } else if (slots[0] === slots[1] && slots[1] === slots[2]) {
      multiplier = command.opts.multiL;
      message = command.opts.messages.wonL;
    } else if (slots[0] === slots[1] || slots[1] === slots[2]) {
      multiplier = command.opts.multiM;
      message = command.opts.messages.wonM;
    } else if (slots[0] === slots[2]) {
      multiplier = command.opts.multiS;
      message = command.opts.messages.wonS;
    } else {
      message = command.opts.messages.lost;
      isWinning = false;
    }

    const reward = isWinning ? multiplier * cost : 0;
    const points = reward - cost;

    message = message
      .replaceAll('$slots', slotsStr)
      .replaceAll('$user', user.username)
      .replaceAll('$cost', cost.toString())
      .replaceAll('$reward', reward.toString())
      .replaceAll('$multiplier', multiplier.toString())
      .replaceAll('$currency', currencyName);

    await user.addPoints(cost, points, command.type, command.isLogEnabled);
    await bot.send(message);

    return true;
  },
};

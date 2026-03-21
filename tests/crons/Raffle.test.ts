// import { test, expect, beforeEach, mock } from 'bun:test';
// import { RaffleCron } from '../../crons/Raffle';
// import { createMockDb } from '../utils/Db';
// import { createMockBot } from '../utils/Twitch';
// import { createTestUser } from '../utils/User';
// import { env } from '../../utils/Config';
// import { Cron, RaffleCronType, CronType } from '../../types/models/Cron';
// import { RaffleCommand } from '../../commands/Raffle';
// import { Command, IRaffleCommand } from '../../types/models/Command';

// let db: ReturnType<typeof createMockDb>;
// let bot: ReturnType<typeof createMockBot>;

// beforeEach(() => {
//   db = createMockDb();
//   bot = createMockBot();

//   env.botCurrencyName = 'coins';
// });

// //
// // 🏗️ LOCAL BUILDERS
// //

// type RaffleCommand = {
//   name: string;
//   type: 'RAFFLE';
//   isEnabled: boolean;
//   onlyOnline: boolean;
//   isLogEnabled: boolean;
//   opts: {
//     messages: {
//       started: string;
//       userWon: string;
//       noBets: string;
//     };
//     showMessages: {
//       noBets: boolean;
//     };
//     betCountdown: number;
//     startCountdown: number;
//     minBet: number;
//     maxBet: number;
//   };
// };

// const createTestRaffleCommand = (overrides?: Partial<Command<IRaffleCommand>>): Command<IRaffleCommand> => {
//   return {
//     ...RaffleCommand.defaultConfig,
//     id: 1,
//     createdAt: new Date(0),
//     updatedAt: new Date(0),
//     ...overrides,
//     opts: {
//       ...RaffleCommand.defaultConfig.opts,
//       ...(overrides?.opts ?? {}),
//     },
//   };
// };

// const createTestRaffleCron = (overrides: Partial<Cron<RaffleCronType>> = {}): Cron<RaffleCronType> => ({
//   id: 1,
//   interval: 0,
//   isEnabled: true,
//   isExecuting: false,
//   isLogEnabled: true,
//   type: 'RAFFLE',
//   lastCalledAt: new Date(0),
//   callAt: new Date(0),
//   createdAt: new Date(),
//   updatedAt: new Date(),
//   opts: {
//     pot: 0,
//     userList: [],
//     isBettingOpened: false,
//     ...(overrides.opts ?? {}),
//   },
//   ...overrides,
// });

// const createTestStatusCron = (overrides: Partial<Cron<{ type: 'STATUS'; opts: { isOnline: boolean } }>> = {}) =>
//   ({
//     id: 1,
//     interval: 0,
//     isEnabled: true,
//     isExecuting: false,
//     isLogEnabled: true,
//     type: 'STATUS',
//     lastCalledAt: new Date(0),
//     callAt: new Date(0),
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     opts: { isOnline: true, ...(overrides.opts ?? {}) },
//     ...overrides,
//   }) as const;

// //
// // ⚙️ SETUP
// //

// const setupRaffle = ({
//   raffleCronOverrides,
//   raffleCommandOverrides,
//   statusOverrides,
// }: {
//   raffleCronOverrides?: Partial<Cron<RaffleCronType>>;
//   raffleCommandOverrides?: Partial<Command<IRaffleCommand>>;
//   statusOverrides?: Partial<Cron<{ type: 'STATUS'; opts: { isOnline: boolean } }>>;
// } = {}) => {
//   const raffleCron = createTestRaffleCron(raffleCronOverrides);
//   const statusCron = createTestStatusCron(statusOverrides);
//   const raffleCommand = createTestRaffleCommand(raffleCommandOverrides);

//   db.Command.fetch = mock(() => raffleCommand);

//   db.Cron.fetch = mock((type: CronType) => {
//     if (type === 'RAFFLE') return raffleCron;
//     if (type === 'STATUS') return statusCron;
//     throw Error('Invalid type');
//   });

//   db.Cron.isExecutePermited = mock(() => true);
//   db.Cron.getCallAtDate = mock(() => new Date());

//   return { raffleCron, raffleCommand, statusCron };
// };

// //
// // ❌ INVALID CASES
// //

// test('returns false if raffle command does not exist', async () => {
//   db.Command.fetch = mock(() => null);

//   const result = await RaffleCron.execute(db, bot);

//   expect(result).toBe(false);
// });

// test('returns false if execution is not permitted', async () => {
//   setupRaffle();

//   db.Cron.isExecutePermited = mock(() => false);

//   const result = await RaffleCron.execute(db, bot);

//   expect(result).toBe(false);
// });

// test('returns false if command is disabled', async () => {
//   setupRaffle({
//     raffleCommandOverrides: { isEnabled: false },
//   });

//   const result = await RaffleCron.execute(db, bot);

//   expect(result).toBe(false);
// });

// test('returns false if onlyOnline is true and stream is offline', async () => {
//   setupRaffle({
//     raffleCommandOverrides: { onlyOnline: true },
//     statusOverrides: { opts: { isOnline: false } },
//   });

//   const result = await RaffleCron.execute(db, bot);

//   expect(result).toBe(false);
// });

// //
// // ✅ VALID CASES
// //

// test('starts betting when betting is closed', async () => {
//   const { raffleCron } = setupRaffle({
//     raffleCronOverrides: {
//       opts: { isBettingOpened: false, pot: 0, userList: [] },
//     },
//   });

//   const result = await RaffleCron.execute(db, bot);

//   expect(result).toBe(true);
//   expect(raffleCron.opts.isBettingOpened).toBe(true);
//   expect(bot.send).toHaveBeenCalledWith('Started 1 100 coins !raffle');
// });

// test('picks winner and rewards points', async () => {
//   const user = createTestUser({ userId: 'u1', username: 'winner' }, db);

//   const { raffleCron } = setupRaffle({
//     raffleCronOverrides: { opts: { isBettingOpened: true, pot: 100, userList: [['u1', 100]] } },
//   });

//   db.User.getById = mock(() => user);

//   // mock(Math.random).mockReturnValue(0);

//   const result = await RaffleCron.execute(db, bot);

//   expect(result).toBe(true);
//   expect(db.User.addPoints).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }), 0, 100, 'RAFFLE', db.Log);
//   expect(bot.send).toHaveBeenCalledWith('winner won 100 coins');
// });

// test('handles no bets case', async () => {
//   const { raffleCron } = setupRaffle({
//     raffleCronOverrides: { opts: { isBettingOpened: true, pot: 0, userList: [] } },
//   });

//   const result = await RaffleCron.execute(db, bot);

//   expect(result).toBe(true);
//   expect(bot.send).toHaveBeenCalledWith('no bets coins');
// });

// test('resets raffle state after execution', async () => {
//   const { raffleCron } = setupRaffle({
//     raffleCronOverrides: { opts: { isBettingOpened: true, pot: 50, userList: [['u1', 50]] } },
//   });

//   await RaffleCron.execute(db, bot);

//   expect(raffleCron.opts.pot).toBe(0);
//   expect(raffleCron.opts.userList).toEqual([]);
//   expect(raffleCron.opts.isBettingOpened).toBe(false);
// });

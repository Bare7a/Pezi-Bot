import fs from 'fs/promises';
import path from 'path';
import { CommandType, CronType, ICommand, ICron, UserType } from '@pezi-bot/db';

import { loadDb } from '../utils/App';
import { Command, Cron, User } from '../models';

(async () => {
  await loadDb();

  const configPath = path.join(process.cwd(), 'config');

  const cronsPath = path.join(configPath, 'crons.json');
  const usersPath = path.join(configPath, 'users.json');
  const commandsPath = path.join(configPath, 'commands.json');

  const [cronsStr, usersStr, commandsStr] = await Promise.all([
    fs.readFile(cronsPath, 'utf8'),
    fs.readFile(usersPath, 'utf-8'),
    fs.readFile(commandsPath, 'utf8'),
  ]);

  const crons: CronType<ICron>[] = JSON.parse(cronsStr);
  const users: UserType[] = JSON.parse(usersStr);
  const commands: Command<ICommand>[] = JSON.parse(commandsStr);

  const cronColumns = Object.keys(crons[0]) as (keyof CronType<ICron>)[];
  const userColumns = Object.keys(users[0]) as (keyof UserType)[];
  const commandColumns = Object.keys(commands[0]) as (keyof CommandType<ICommand>)[];

  await Promise.all([
    Cron.bulkCreate(crons, { updateOnDuplicate: cronColumns }),
    User.bulkCreate(users, { updateOnDuplicate: userColumns }),
    Command.bulkCreate(commands, { updateOnDuplicate: commandColumns }),
  ]);
})();

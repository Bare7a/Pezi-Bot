import fs from 'fs/promises';
import path from 'path';
import { Command, Cron, User, syncDb } from '../models';

(async () => {
  const isDirExist = async (path: string) =>
    await fs
      .access(path)
      .then(() => true)
      .catch(() => false);

  await syncDb();

  const configPath = path.join(process.cwd(), 'config');
  const isConfigPathExists = await isDirExist(configPath);

  if (!isConfigPathExists) {
    await fs.mkdir(configPath);
  }

  const cronsPath = path.join(configPath, 'crons.json');
  const usersPath = path.join(configPath, 'users.json');
  const commandsPath = path.join(configPath, 'commands.json');

  const [crons, users, commands] = await Promise.all([Cron.findAll(), User.findAll(), Command.findAll()]);
  await Promise.all([
    fs.writeFile(cronsPath, JSON.stringify(crons, null, 2)),
    fs.writeFile(usersPath, JSON.stringify(users, null, 2)),
    fs.writeFile(commandsPath, JSON.stringify(commands, null, 2)),
  ]);
})();

import path from 'path';
import Sequelize from '@sequelize/core';
import { ConfigType } from '@pezi-bot/shared';
import { config } from 'dotenv';

const dirs = { dir1: process.cwd(), dir2: path.normalize('../../') };
const envs = {
  env1: config({ path: path.join(dirs.dir1, '.env') }).parsed,
  env2: config({ path: path.join(dirs.dir2, '.env') }).parsed,
};

const env = envs.env1 ?? envs.env2;
const dir = envs.env1 ? dirs.dir1 : dirs.dir2;
if (!env) throw Error(`Couldn't find an .env file in the current directory`);

export const CONFIG: ConfigType = {
  streamer: env.bot_streamer ?? 'NOT_DEFINED',
  username: env.bot_username ?? 'NOT_DEFINED',
  clientId: env.bot_client_id ?? 'NOT_DEFINED',
  password: env.bot_access_token ?? 'NOT_DEFINED',
  accessToken: env.bot_access_token ?? 'NOT_DEFINED',
  refreshToken: env.bot_refresh_token ?? 'NOT_DEFINED',
  currencyName: env.bot_currency_name ?? 'NOT_DEFINED',
  defaultPoints: Number(env.bot_default_points ?? -1337),
  dbPath: env.bot_db_path ?? path.join(dir, 'db.sqlite'),
  logPath: env.bot_db_path ?? path.join(dir, 'log.sqlite'),
  webAppUrl: env.bot_web_app_url ?? 'http://localhost:3000',
  webAppPort: Number(env.bot_web_app_port ?? 3000),
  webAppSecret: env.bot_web_app_secret ?? 'NOT_DEFINED',
} as const;

if (['NOT_DEFINED', -1337].some((invalidValue) => Object.values(CONFIG).includes(invalidValue)))
  throw Error(`The provided .env file has missing values, please update: \n ${JSON.stringify(CONFIG, null, 2)}`);

export const SEQUELIZE_DB_CONFIG = new Sequelize({ logging: false, dialect: 'sqlite', storage: CONFIG.dbPath });
export const SEQUELIZE_LOG_CONFIG = new Sequelize({ logging: false, dialect: 'sqlite', storage: CONFIG.logPath });

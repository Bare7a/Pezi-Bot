import path from 'path';
import { ConfigType } from '../types';
import { config } from 'dotenv';
config();

export const CONFIG: ConfigType = {
  streamer: process.env.bot_streamer ?? 'NOT_DEFINED',
  username: process.env.bot_username ?? 'NOT_DEFINED',
  password: process.env.bot_password ?? 'NOT_DEFINED',
  clientId: process.env.bot_client_id ?? 'NOT_DEFINED',
  accessToken: process.env.bot_access_token ?? 'NOT_DEFINED',
  refreshToken: process.env.bot_refresh_token ?? 'NOT_DEFINED',
  currencyName: process.env.bot_currency_name ?? 'NOT_DEFINED',
  defaultPoints: Number(process.env.bot_default_points ?? -1337),
  dbPath: process.env.bot_db_path ?? path.join(process.cwd(), 'db.sqlite'),
  logPath: process.env.bot_db_path ?? path.join(process.cwd(), 'log.sqlite'),
};

if (['NOT_DEFINED', -1337].some((invalidValue) => Object.values(CONFIG).includes(invalidValue)))
  throw Error(`The provided .env file has missing values, please update: \n ${JSON.stringify(CONFIG, null, 2)}`);

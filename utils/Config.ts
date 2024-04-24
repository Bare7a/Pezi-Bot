if (!process.env.bot_streamer) throw Error('ENV bot_streamer is missing!');
if (!process.env.bot_username) throw Error('ENV bot_username is missing!');
if (!process.env.bot_client_id) throw Error('ENV bot_client_id is missing!');
if (!process.env.bot_access_token) throw Error('ENV bot_access_token is missing!');
if (!process.env.bot_refresh_token) throw Error('ENV bot_refresh_token is missing!');
if (!process.env.bot_currency_name) throw Error('ENV bot_currency_name is missing!');
if (Number(process.env.bot_default_points) <= 0) throw Error('ENV bot_default_points is missing or less than 0!');

export const env = {
  botStreamer: process.env.bot_streamer,
  botUsername: process.env.bot_username,
  botClientId: process.env.bot_client_id,
  botAccessToken: process.env.bot_access_token,
  botRefreshToken: process.env.bot_refresh_token,
  botCurrencyName: process.env.bot_currency_name,
  botDefaultPoints: Number(process.env.bot_default_points),
};

export type Env = typeof env;

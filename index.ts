import { env } from './utils/Config';
import { RaffleCron } from './crons/Raffle';
import { RewardCron } from './crons/Reward';
import { StatusCron } from './crons/Status';
import { TriviaCron } from './crons/Trivia';
import { TwitchClient } from './utils/Twitch';
import { SqliteConnection, Db } from './utils/DB';

const socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
const dbConnection = new SqliteConnection('./db.sqlite', { create: true });

const db = new Db(dbConnection);
const bot = new TwitchClient(socket);
const crons = [StatusCron, RewardCron, TriviaCron, RaffleCron];

db.Cron.resetExecution();
setInterval(() => crons.map(async (cron) => await cron.execute(db, bot)), 1000);

socket.addEventListener('message', (event) => {
  try {
    const message = String(event.data);
    if (message.startsWith('PING')) return socket.send(message.replace('PING', 'PONG'));

    const userMessage = bot.parseMessage(message);
    if (!userMessage) return;

    const params = userMessage.message.split(' ');
    const commandName = params.shift();

    const user = db.User.sync(userMessage);
    db.User.addAsChatter(user, db.Cron);

    if (!commandName) return false;

    const command = db.Command.fetchByName(commandName);
    if (!command) return false;

    const userCanExecute = db.Command.canUserExecute(command, user, db, bot);
    if (!userCanExecute) return false;

    const isExecutedSuccesfully = db.Command.execute(command, user, params, db, bot);
    if (isExecutedSuccesfully) db.Command.addCooldowns(command, user);

    return true;
  } catch (ex) {
    console.log(`There was an error while trying to execute "${event.data}"`);
    console.log(ex);

    return false;
  }
});

socket.addEventListener('open', (event) => {
  console.log(`WebSocket Client ${env.botUsername} Connected to ${env.botStreamer}`);
  socket.send(`CAP REQ :twitch.tv/tags`);
  socket.send(`PASS oauth:${env.botAccessToken}`);
  socket.send(`NICK ${env.botUsername}`);
  socket.send(`JOIN #${env.botStreamer}`);
});

socket.addEventListener('close', (event) => console.log(event));

socket.addEventListener('error', (event) => console.log(event));

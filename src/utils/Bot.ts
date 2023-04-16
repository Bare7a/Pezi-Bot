import { Client, Options } from 'tmi.js';

type TwitchClientOptions = { streamer: string; username: string };
export class TwitchClient extends Client {
  private streamer: string;
  private username: string;

  constructor(base: Options, options: TwitchClientOptions) {
    super(base);
    this.streamer = options.streamer;
    this.username = options.username;
  }

  async send(message: string) {
    await this.say(this.streamer, message);
  }

  async start() {
    this.on('connected', () => console.log(`CONNECTED: ${this.username} to ${this.streamer}`));
    await this.connect();
  }
}

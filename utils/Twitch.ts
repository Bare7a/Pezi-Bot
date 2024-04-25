import { env } from './Config';
import { TwitchActions, UserMessage } from '../types/utils/Twitch';
import { TwitchIds, ApiTwitchIds, ApiTwitchStatus, ApiViewersIds } from '../types/utils/Api';

export class TwitchClient implements TwitchActions {
  private twitchIds: TwitchIds = null;
  private headers = { 'Client-Id': env.botClientId, Authorization: `Bearer ${env.botAccessToken}` };

  constructor(private ws: WebSocket) {}

  private getTwitchIds = async (): Promise<TwitchIds> => {
    try {
      if (this.twitchIds) return this.twitchIds;
      const params = new URLSearchParams();
      params.append('login', env.botUsername);
      params.append('login', env.botStreamer);

      const headers = this.headers;
      const url = `https://api.twitch.tv/helix/users?${params.toString()}`;

      const response = await fetch(url, { headers, method: 'GET' });
      const resData: ApiTwitchIds = await response.json();

      const moderator = resData.data.find((u) => u.login === env.botUsername);
      const broadcaster = resData.data.find((u) => u.login === env.botStreamer);

      if (!moderator || !broadcaster) {
        throw Error(
          `There was an error while fetching:${moderator ? '' : ' moderator'}${broadcaster ? '' : ' broadcaster'}`
        );
      }

      this.twitchIds = {
        moderator_id: moderator.id,
        broadcaster_id: broadcaster.id,
      };

      return this.twitchIds;
    } catch (ex) {
      console.log(`There was an error while calling TwitchClient.getTwitchIds`);
      console.log(ex);

      return null;
    }
  };

  public send = (message: string) => {
    this.ws.send(`PRIVMSG #${env.botStreamer} :${message}`);
  };

  public addEventListener = <T extends keyof WebSocketEventMap>(
    type: T,
    listener: (this: WebSocket, event: WebSocketEventMap[T]) => unknown,
    options?: boolean | AddEventListenerOptions | undefined
  ) => this.ws.addEventListener(type, listener, options);

  public parseMessage = (message: string): UserMessage | null => {
    try {
      const userTypeIdx = message.indexOf('user-type');
      if (userTypeIdx === -1) return null;

      const meta = message.slice(0, userTypeIdx);
      const uMsg = message.slice(userTypeIdx + 10);
      if (!uMsg || !meta) return null;

      const msg = new RegExp(/:([^!]*)![^:]*:(.*)/).exec(uMsg);
      if (!msg?.[1] || !msg?.[2]) return null;

      const keyValues = meta.split(';');
      const map: Record<string, string> = {};

      for (const keyValue of keyValues) {
        const [key, value] = keyValue.split('=');
        map[key] = value;
      }

      const badges = map['badges'] ?? '';
      const userMessage = {
        userId: msg[1],
        username: map['display-name'],
        message: msg[2],
        color: map['color'] ?? '',
        isMod: map['mod'] === '1',
        isSub: map['subscriber'] === '1',
        isVip: badges.includes('vip/1'),
        isAdmin: badges.includes('broadcaster/1'),
        isStreamer: badges.includes('broadcaster/1'),
      };

      return userMessage;
    } catch (err) {
      console.log(`Error while parsing Twitch message:`, err);
      return null;
    }
  };

  public isStreamOnline = async (): Promise<boolean> => {
    try {
      const headers = this.headers;
      const params = new URLSearchParams({ user_login: env.botStreamer });
      const url = `https://api.twitch.tv/helix/streams?${params.toString()}`;

      const res = await fetch(url, { method: 'GET', headers });
      const resData: ApiTwitchStatus = await res.json();
      const data = resData.data[0];

      const isOnline = data?.type === 'live';
      return isOnline;
    } catch (ex) {
      console.log(`There was an error while calling TwitchClient.isStreamOnline`);
      console.log(ex);

      return false;
    }
  };

  getViewerUserIds = async (): Promise<string[]> => {
    try {
      const ids = await this.getTwitchIds();
      if (!ids) throw Error(`Couldn't fetch streamer and bot id`);

      const headers = this.headers;

      let after = undefined;
      const viewers = [];
      do {
        const params = new URLSearchParams({ ...this.twitchIds, first: '1000' });
        if (after) params.append('after', after);

        const url = `https://api.twitch.tv/helix/chat/chatters?${params.toString()}`;

        const response = await fetch(url, { method: 'GET', headers });
        const resData: ApiViewersIds = await response.json();

        viewers.push(...resData.data.map((u) => u.user_login));
        after = resData.pagination.cursor;
      } while (after);

      return viewers;
    } catch (ex) {
      console.log(`There was an error while calling TwitchClient.getViewers`);
      console.log(ex);

      return [];
    }
  };
}

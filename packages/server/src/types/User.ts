import { ChatUserstate } from 'tmi.js';

export type ValidUserState = ChatUserstate & { username: string; 'display-name': string };

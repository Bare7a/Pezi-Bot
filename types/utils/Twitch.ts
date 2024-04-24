export interface TwitchActions {
  send(message: string): void;
  parseMessage(message: string): UserMessage | null;
  isStreamOnline(): Promise<boolean>;
  getViewerUserIds(): Promise<string[]>;

  addEventListener<T extends keyof WebSocketEventMap>(
    type: T,
    listener: (this: WebSocket, event: WebSocketEventMap[T]) => unknown,
    options?: boolean | AddEventListenerOptions | undefined
  ): void;
}

export type UserMessage = {
  userId: string;
  username: string;
  message: string;
  color: string;
  isMod: boolean;
  isSub: boolean;
  isVip: boolean;
  isAdmin: boolean;
  isStreamer: boolean;
};

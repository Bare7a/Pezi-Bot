import { mock } from 'bun:test';

export const createMockBot = () => {
  let viewers: string[] = [];
  let onlineStatus = true;

  return {
    send: mock(() => {}),
    parseMessage: mock((msg) => msg),
    isStreamOnline: mock(async () => onlineStatus),
    getViewerUserIds: mock(async () => viewers),
    addEventListener: mock(() => {}),

    setViewers: (viewerIds: string[]) => (viewers = viewerIds),
    setIsOnline: (isOnline: boolean) => (onlineStatus = isOnline),
    reset: () => {
      viewers = [];
      onlineStatus = true;
    },
  };
};

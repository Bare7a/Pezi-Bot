import { mock } from 'bun:test';

export const createMockBot = () => ({
  send: mock(() => {}),
  parseMessage: mock((msg) => msg),
  isStreamOnline: mock(async () => true),
  getViewerUserIds: mock(async () => []),
  addEventListener: mock(() => {}),
});

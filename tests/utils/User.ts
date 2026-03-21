import { User } from '../../types/models/User';
import { DbActions } from '../../types/utils/DB';
import { MockDbState } from './Db';

export const createTestUser = (db: DbActions & { state: MockDbState }, overrides: Partial<User> = {}): User => {
  const username = overrides.username ?? 'Tester';
  const userId = username.toLowerCase();

  const user = {
    id: db.state.users.size + 1,
    userId,
    username,
    watchTime: 0,
    points: 100,
    color: '#fff',

    isSub: false,
    isVip: false,
    isMod: false,
    isAdmin: false,
    isStreamer: false,

    commands: {},
    createdAt: new Date(),
    updatedAt: new Date(),

    ...structuredClone(overrides),
  };

  db.state.users.set(user.userId, user);

  return user;
};

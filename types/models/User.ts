const userRoleType = ['streamer', 'admin', 'mod', 'sub', 'vip', 'member'] as const;
export type UserRoleType = (typeof userRoleType)[number];

export type GenericUser = {
  id: number;
  userId: string;
  username: string;
  points: number;
  color: string;
  isSub: boolean;
  isVip: boolean;
  isMod: boolean;
  isAdmin: boolean;
  isStreamer: boolean;
};

export type DbUser = GenericUser & {
  commands: string;
  createdAt: string;
  updatedAt: string;
};

export type User = GenericUser & {
  commands: Record<string, Date>;
  createdAt: Date;
  updatedAt: Date;
};

export type UserTable = DbUser & { _name: 'Users' };

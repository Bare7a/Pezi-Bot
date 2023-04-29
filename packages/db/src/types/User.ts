export type UserRoleType = 'streamer' | 'admin' | 'mod' | 'sub' | 'vip' | 'member';

export type UserType = {
  id?: number;
  userId: string;
  username: string;
  points: number;
  color?: string;
  isVIP: boolean;
  isSub: boolean;
  isMod: boolean;
  isAdmin: boolean;
  isStreamer: boolean;
  commands: {
    [key: string]: string;
  };
};

export type UsersType = {
  [key: string]: UserType;
};

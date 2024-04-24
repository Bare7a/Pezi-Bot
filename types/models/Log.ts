export type GenericLog = {
  id: number;
  type: string;
  userId: string;
  cost: number;
  points: number;
  allPoints: number;
};

export type DbLog = GenericLog & {
  createdAt: string;
  updatedAt: string;
};

export type Log = GenericLog & {
  createdAt: Date;
  updatedAt: Date;
};

export type LogType = {
  id?: number;
  type: string;
  userId: string;
  cost: number;
  points: number;
  allPoints: number;
};

export type LogTable = DbLog & { _name: 'Logs' };

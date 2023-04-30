// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

import { Command } from '@pezi-bot/bot';
import { ICommand } from '@pezi-bot/db';

export type CommandItem = {
  id: string;
  name: string;
  type: ICommand['type'];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<CommandItem[]>) {
  const commands = (await Command.findAll({ attributes: ['id', 'name', 'type'], raw: true })) as CommandItem[];
  res.status(200).json(commands);
}

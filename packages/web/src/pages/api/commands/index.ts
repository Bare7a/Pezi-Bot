import { NextApiRequest, NextApiResponse } from 'next';

type CommandItem = {
  id: number;
  name: string;
  type: string;
};

export default async function commandsHandler({ db }: NextApiRequest, res: NextApiResponse<CommandItem[]>) {
  const commands = (await db.Command.findAll({ attributes: ['id', 'name', 'type'] })) as CommandItem[];
  return res.status(200).json(commands);
}

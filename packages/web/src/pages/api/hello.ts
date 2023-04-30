// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { CONFIG, ConfigType } from '@pezi-bot/bot';

type Data = {
  name: string;
};

export default function handler(req: NextApiRequest, res: NextApiResponse<ConfigType>) {
  // res.status(200).json({ name: 'John Doe' })
  console.log(process.cwd());
  res.status(200).json(CONFIG);
}

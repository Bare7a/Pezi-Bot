import { NextApiRequest, NextApiResponse } from 'next';
import { User } from 'next-auth';

export default async function loginHandler({ db, body }: NextApiRequest, res: NextApiResponse<User | string>) {
  const { username } = body;
  const user = await db.User.findOne({ where: { username } });

  if (!user) return res.status(400).send(`Invalid username or password`);
  if (!user.isAdmin) return res.status(400).send(`${user.username} you don't have permission to use the dashboard!`);

  const authUser = { id: user.userId, name: username, picture: user.id };
  return res.status(200).json(authUser);
}

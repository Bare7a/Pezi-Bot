import { Api } from '../utils';
import { Cron } from '../db';
import { StatusCronType } from '../types';

export const updateStreamStatus = async () => {
  try {
    const statusCron = await Cron.fetch<StatusCronType>('STATUS');
    const isExecutionTime = statusCron.isExecutePermited();

    if (!isExecutionTime) return false;

    statusCron.isExecuting = true;
    await statusCron.save();
    const isStreamOnline = await Api.isStreamOnline();

    statusCron.isExecuting = false;
    statusCron.lastCalledAt = new Date();
    statusCron.callAt = statusCron.getCallAtDate();
    statusCron.opts.isOnline = isStreamOnline;
    statusCron.changed('opts', true);

    await statusCron.save();
    console.log(` *** Stream online status: ${isStreamOnline} *** `);

    return true;
  } catch (ex) {
    console.log(`There was an error while running updateStreamStatus`);
    console.log(ex);

    return false;
  }
};

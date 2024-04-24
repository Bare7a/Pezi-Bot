import { MessageCommand } from './Message';
import { INoteCommand, Command } from '../types/models';
import { CommandActionType, isNoteCommand } from '../types/utils';

export const NoteCommand: CommandActionType<INoteCommand> = {
  isValid: (command): command is Command<INoteCommand> => isNoteCommand(command),
  execute: (user, params, command, db, bot): boolean => {
    const modifier = params.shift();
    const name = params.shift();
    const value = params.join(' ');

    const cd = Number(value) ? Math.abs(Number(value)) : NaN;
    if (!name) return false;

    let cmd = db.Command.fetchByName(name);

    if (modifier === 'add' && !cmd && name) cmd = db.Command.createNewMessage(name, value);
    if (!cmd || !MessageCommand.isValid(cmd)) return false;

    let message;
    switch (modifier) {
      case 'add':
        message = command.opts.messages.add;
        break;
      case 'remove':
        message = command.opts.messages.remove;
        db.Command.deleteById(command.id);
        break;
      case 'enable':
        message = command.opts.messages.enable;
        db.Command.update({ ...cmd, isEnabled: true });
        break;
      case 'disable':
        message = command.opts.messages.disable;
        db.Command.update({ ...cmd, isEnabled: false });
        break;
      case 'ucd':
        message = command.opts.messages.userCd;
        db.Command.update({ ...cmd, userCd: cd });
        break;
      case 'gcd':
        message = command.opts.messages.globalCd;
        db.Command.update({ ...cmd, globalCd: cd });
        break;
      case 'set':
        message = command.opts.messages.set;
        cmd.opts.message = value;
        db.Command.update({ ...cmd });
        break;
      default:
        return false;
    }

    message = message
      .replaceAll('$user', user.username)
      .replaceAll('$command', cmd.name)
      .replaceAll('$message', cmd.opts.message)
      .replaceAll('$cd', cd.toString());
    bot.send(message);

    return true;
  },
  defaultConfig: {
    name: '!note',
    type: 'NOTE',
    cost: 0,
    customCost: false,
    userCd: 0,
    globalCd: 0,
    cdMessage: '$user You can use $command after $cd seconds!',
    showCdMessage: true,
    isEnabled: true,
    onlyOnline: false,
    permissions: ['streamer', 'admin', 'mod'],
    lastCalledAt: new Date(0),
    isLogEnabled: false,
    opts: {
      messages: {
        add: '$user added the command $command - $message',
        set: '$user set the command $command - $message',
        remove: '$user removed the command $command - $message',
        enable: '$user enabled the command $command - $message',
        disable: '$user disabled the command $command - $message',
        userCd: '$user changed the user CD $command to $cd seconds',
        globalCd: '$user changed the global CD $command to $cd seconds',
      },
    },
  },
};

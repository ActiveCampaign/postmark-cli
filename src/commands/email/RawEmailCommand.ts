import {RawEmailArguments} from "../../types";
import {ServerRequest, TokenType} from "../../handler/requests/ServerRequest";
import {MessageSendingResponse} from "postmark/dist/client/models";
import {CommandHandler} from "../../handler/CommandHandler";

export class RawEmailCommand extends CommandHandler {
  public constructor(command: string, description: string, options: any) {
    super(command, description, options);
  }

  public async execute(args: RawEmailArguments): Promise<void> {
    let {serverToken} = args;
    const { from, to, subject, html, text} = args;
    serverToken = await this.authenticateByToken(serverToken, TokenType.Server);

    const data: MessageSendingResponse|undefined = await this.executeRequest<MessageSendingResponse>('Sending an email ...',
      new ServerRequest(serverToken).sendEmail(from, to, subject, html, text));

    if (data !== undefined) {
      this.response.respond(this.getDataFormat().format(data));
    }
  }
}

const options: any = {
  'server-token': {
    type: 'string',
    hidden: true,
  },
  from: {
    type: 'string',
    describe:
      'Email address you are sending from. Must be an address on a verified domain or confirmed Sender Signature.',
    alias: 'f',
    required: true,
  },
  to: {
    type: 'string',
    describe: 'Email address you are sending to',
    alias: 't',
    required: true,
  },
  subject: {
    type: 'string',
    describe: 'The subject line of the email',
    required: true,
  },
  html: {
    type: 'string',
    describe: 'The HTML version of the email',
  },
  text: {
    type: 'string',
    describe: 'The text version of the email',
  },
}

const commandHandler: RawEmailCommand = new RawEmailCommand('raw [options]', 'Send a raw email', options);

export const command = commandHandler.details.command;
export const desc = commandHandler.details.description;
export const builder = commandHandler.details.options;
export const handler = (args: any): Promise<void> => commandHandler.execute(args);
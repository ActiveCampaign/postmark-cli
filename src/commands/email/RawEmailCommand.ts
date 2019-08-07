import {CommandHandler} from "../../handler/CommandHandler";
import {RawEmailArguments} from "../../types";
import * as pm from "postmark";

export class RawEmailCommand extends CommandHandler {
  public constructor(command: string, description: string, options: any) {
    super(command, description, options);
  }

  public async execute(args: RawEmailArguments): Promise<void> {
    let {serverToken} = args;
    const { from, to, subject, html, text} = args;

    try {
      serverToken = await this.validateAndRetrieveToken(serverToken);
      this.setServerClientToUse(serverToken);

      const data: pm.Models.MessageSendingResponse =
        await this.spinnerResponse.respond<pm.Models.MessageSendingResponse>('Sending an email ...',
          this.serverClient.sendEmail({ From: from, To: to, Subject: subject, HtmlBody: html, TextBody: text }));

      if (data !== undefined) {
        this.response.respond(this.getFormattedData(data));
      }
    } catch (error) {
      this.response.error(error.message);
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
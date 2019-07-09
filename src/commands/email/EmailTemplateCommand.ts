import {TemplatedEmailArguments} from "../../types";
import {ServerRequest, TokenType} from "../../handler/requests/ServerRequest";
import {MessageSendingResponse} from "postmark/dist/client/models";
import {CommandHandler} from "../../handler/CommandHandler";

class EmailTemplateCommand extends CommandHandler {
  public constructor(command: string, description: string, options: any) {
    super(command, description, options);
  }

  public async execute(args: TemplatedEmailArguments): Promise<void> {
    let {serverToken} = args;
    const { id, alias, from, to, model } = args;
    serverToken = await this.authenticateByToken(serverToken, TokenType.Server);

    const data: MessageSendingResponse|undefined = await this.executeRequest<MessageSendingResponse>('Sending an email ...',
      new ServerRequest(serverToken).sendEmailWithTemplate(id, alias, from, to, model));

    if (data !== undefined) {
      this.response.respond(this.getDataFormat().format(data));
    }
  }
}

const options: any = {
  'source-server': {
    type: 'string',
    hidden: true,
  },
  id: {
    type: 'string',
    describe: 'Template ID. Required if a template alias is not specified.',
    alias: 'i',
  },
  alias: {
    type: 'string',
    describe: 'Template Alias. Required if a template ID is not specified.',
    alias: 'a',
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
  model: {
    type: 'string',
    describe: '',
    alias: 'm',
  },
}

const commandHandler: EmailTemplateCommand = new EmailTemplateCommand('template [options]', 'Send a templated email', options);

export const command = commandHandler.details.command;
export const desc = commandHandler.details.description;
export const builder = commandHandler.details.options;
export const handler = (args: any): Promise<void> => commandHandler.execute(args);
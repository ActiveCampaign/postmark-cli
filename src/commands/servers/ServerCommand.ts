import {ServerListArguments} from "../../types";
import {AccountRequest} from "../../handler/requests/AccountRequest";
import {TokenType} from "../../handler/requests/ServerRequest";
import {CommandHandler} from "../../handler/CommandHandler";
import {Servers} from "postmark/dist/client/models";
import {ServerTableFormat} from "./data/ServerTableFormat";
import {DataFormat} from "../../handler/data/DataFormat";

class ServerCommand extends CommandHandler {
  public constructor(command: string, description: string, options: any) {
    super(command, description, options);
  }

  public async execute(args: ServerListArguments): Promise<void> {
    let {count, offset, name, showTokens, json, accountToken} = args;
    accountToken = await this.authenticateByToken(accountToken, TokenType.Account);

    const data: Servers|undefined = await this.executeRequest<Servers>('Fetching data...',
      new AccountRequest(accountToken).getServers(count, offset, name));

    if (data !== undefined) {
      this.adjustContent(data, showTokens);
      this.response.respond(this.getDataFormat(json).format(data));
    }
  }

  protected getDataFormat(json: boolean):DataFormat {
    return (json === true) ? super.getDataFormat(json): new ServerTableFormat();
  }

  private adjustContent(data: Servers, showTokens: boolean): void {
    if (showTokens !== true) { this.hideTokens(data); }
  }

  private hideTokens(data: Servers):void {
    data.Servers.forEach(item => {
      item.ApiTokens.forEach((token, index) => (item.ApiTokens[index] = this.tokenMask()));
    });
  }

  private tokenMask(): string {
    return '•'.repeat(36);
  }
}

const options: any = {
  'account-token': {
    type: 'string',
    hidden: true,
  },
  count: {
    type: 'number',
    describe: 'Number of data to return',
    alias: ['c'],
  },
  offset: {
    type: 'number',
    describe: 'Number of data to skip',
    alias: ['o'],
  },
  name: {
    type: 'string',
    describe: 'Filter data by name',
    alias: ['n'],
  },
  json: {
    type: 'boolean',
    describe: 'Return server list as JSON',
    alias: ['j'],
  },
  'show-tokens': {
    type: 'boolean',
    describe: 'Show server tokens with server info',
    alias: ['t'],
  },
};

const commandHandler: ServerCommand = new ServerCommand('list [options]', 'List the data on your account', options);

export const command = commandHandler.details.command;
export const desc = commandHandler.details.description;
export const builder = commandHandler.details.options;
export const handler = (args: any): Promise<void> => commandHandler.execute(args);
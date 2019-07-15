import {ServerListArguments} from "../../types";
import {CommandHandler, TokenType} from "../../handler/CommandHandler";
import {ServerTableFormat} from "./data/ServerTableFormat";
import {Servers} from "postmark/dist/client/models";

class ServerCommand extends CommandHandler {
  public constructor(command: string, description: string, options: any) {
    super(command, description, options);
  }

  public async execute(args: ServerListArguments): Promise<void> {
    let {count, offset, name, showTokens, json, accountToken} = args;
    accountToken = await this.authenticateByToken(accountToken, TokenType.Account);
    this.setAccountClientToUse(accountToken);

    try {
      const data: Servers = await this.spinnerResponse.respond<Servers>('Fetching data...',
        this.accountClient.getServers({count: count, offset: offset, name: name}));

      this.adjustContent(data, showTokens);
      this.showServerList(data, json);

    } catch (error) {
      this.response.error(error.message);
    }

  }

  private showServerList(data: any, json: boolean) {
    const formattedData: string = this.getFormattedData(data, json);
    this.response.respond(formattedData);
  }

  protected getFormattedData(data: Servers, json: boolean): string {
    return (json === true) ? super.getFormattedData(data) : new ServerTableFormat().format(data)
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
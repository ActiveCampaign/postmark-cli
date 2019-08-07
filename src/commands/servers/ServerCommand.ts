import {CommandHandler, TokenTypes} from "../../handler/CommandHandler";
import {ServerListArguments} from "../../types";
import {ServerListTable} from "./data/ServerListTable";
import * as pm from "postmark";

/**
 * Server command execution details class.
 * It describes all the steps needed to retrieve Postmark server details.
 */
class ServerCommand extends CommandHandler {
  public constructor(command: string, description: string, options: any) {
    super(command, description, options);
  }

  /**
   * Execute command with specific arguments.
   *
   * @param {ServerListArguments} args - command line arguments
   * @return {Promise<void>}
   */
  public async execute(args: ServerListArguments): Promise<void> {
    let {count, offset, name, showTokens, json, accountToken} = args;

    try {
      accountToken = await this.validateAndRetrieveToken(accountToken, TokenTypes.Account);
      this.setAccountClientToUse(accountToken);

      const data: pm.Models.Servers = await this.spinnerResponse.respond<pm.Models.Servers>(
        'Fetching pm.Models.Servers...', this.accountClient.getServers({count: count, offset: offset, name: name}));

      this.adjustContent(data, showTokens);
      this.showServerList(data, json);

    } catch (error) {
      this.response.error(error.message);
    }
  }

  /**
   * Display server list in specific format - table or JSON format.
   *
   * @param data - data to transform into JSON or table representation.
   * @param {boolean} json - transform to JSON format?
   */
  private showServerList(data: any, json: boolean): void {
    this.response.respond(this.getFormattedData(data, json));
  }

  /**
   * Retrieve JSON or table representation of data.
   *
   * @param {pm.Models.Servers} data - data to transform
   * @param {boolean} json - transform to JSON format
   * @return {string} - string formatted to JSON or table
   */
  protected getFormattedData(data: pm.Models.Servers, json: boolean): string {
    return (json === true) ? super.getFormattedData(data) : new ServerListTable().getData(data)
  }

  /**
   * Adjust server content in case tokens need to be hidden.
   *
   * @param {pm.Models.Servers} data - data to transform
   * @param {boolean} showTokens - hide tokens in data?
   */
  private adjustContent(data: pm.Models.Servers, showTokens: boolean): void {
    if (showTokens !== true) { this.hideTokens(data); }
  }

  private hideTokens(data: pm.Models.Servers): void {
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
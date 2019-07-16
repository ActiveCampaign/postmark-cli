import {Arguments, LogTypes} from "../types/index";
import CommandDetails from "./CommandDetails";
import {JSONFormat} from "./data/JSONFormat";
import {SpinnerResponse, ShellResponse} from "./response";
import {FileHandling, PromptCollection} from "./utils";
import {ServerClient, AccountClient} from "postmark";

export enum TokenTypes {
  Account = 'account',
  Server = 'server'
}

/**
 * Main class responsible for handling any command actions. This class must be implemented in order to create a new
 * command to execute. It provides utilities to make command executions easy.
 */
export abstract class CommandHandler {
  public details: CommandDetails;
  protected response: ShellResponse;
  protected spinnerResponse: SpinnerResponse;
  protected serverClient: ServerClient;
  protected accountClient: AccountClient;
  protected fileUtils: FileHandling;
  protected prompts: PromptCollection;

  protected constructor(command: string, description: string, options: any) {
    this.details = new CommandDetails(command, description, options);
    this.response = new ShellResponse();
    this.spinnerResponse = new SpinnerResponse();
    this.serverClient = new ServerClient("1111");
    this.accountClient = new AccountClient("1111");
    this.fileUtils = new FileHandling();
    this.prompts = new PromptCollection();

  }

  /**
   * Command execution.
   *
   * @param {Arguments} args - parameters passed to command on which execution is based.
   * @return {Promise<void>}
   */
  public abstract async execute(args: Arguments): Promise<void>;

  /**
   * Set Postmark.js account client to use for client actions executed by command.
   * @param {string} token - account token to use for client
   */
  protected setAccountClientToUse(token: string): void {
    this.accountClient = new AccountClient(token);
  }


  /**
   * Set Postmark.js server client to use for client actions executed by command.
   * @param {string} token - server token to use for client
   */
  protected setServerClientToUse(token: string): void {
    this.serverClient = new ServerClient(token);
  }

  /**
   * Transform data to JSON by default.
   * @param data - input data
   * @param {boolean} json - JSON parameter
   * @return {string} - transformed input data
   */
  protected getFormattedData(data: any, json: boolean = true):string {
    return new JSONFormat().transform(data);
  }

  protected async authenticateByToken(token: string, tokenType: TokenTypes = TokenTypes.Server): Promise<string> {
    if (this.isValueInvalid(token)) {
      return this.retrieveTokenByPrompt(tokenType).then( token => { return token; })
    }
    else {
      return token;
    }
  }

  protected async retrieveTokenByPrompt(tokenType: TokenTypes): Promise<string> {
    const {token} = await this.prompts.auth(tokenType);

    if (this.isValueInvalid(token)) {
      this.response.error(`Invalid ${tokenType} token. Please provide a valid token.`)
    }

    return token;
  }

  protected isValueInvalid(text: string): boolean {
    return (text === undefined || text.toString().length == 0);
  }


  protected confirmation(message: string = 'Would you like to continue?', cancelMessage: string = 'Cancelled. Have a good day!'): Promise<boolean> {
    return this.prompts.confirmation(message).then(answer => {
      if (answer.confirm !== true) {
        this.response.respond(cancelMessage, LogTypes.Warning);
        return answer.confirm;
      }
      return answer.confirm;
    }).catch(e => {
      return false;
    });
  }
}



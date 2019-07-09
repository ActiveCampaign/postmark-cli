import {Arguments} from "../types/index";
import {prompt} from "inquirer";
import {ShellResponse} from "./response/ShellResponse";
import {TokenType} from "./requests/ServerRequest";
import CommandDetails from "./CommandDetails";
import {DataFormat} from "./data/DataFormat";
import {JSONFormat} from "./data/JSONFormat";

export abstract class CommandHandler {
  public details: CommandDetails;
  protected response: ShellResponse;

  protected constructor(command: string, description: string, options: any) {
    this.details = new CommandDetails(command, description, options);
    this.response = new ShellResponse();
  }

  public abstract async execute(args: Arguments): Promise<void>;

  protected async executeRequest<T>(message: string, request: Promise<any>): Promise<T|undefined> {
    try {
      this.response.respondWithSpinner(message);
      return await request;
    }
    catch (error)  {
      this.response.error(error)
    }
  }

  protected getDataFormat(json: boolean = false):DataFormat {
    return new JSONFormat();
  }

  protected async authenticateByToken(token: string, tokenType: TokenType): Promise<string> {
    if (this.isValueInvalid(token)) {
      return this.retrieveTokenByPrompt(tokenType).then( token => { return token; });
    }
    else {
      return token;
    }
  }

  protected async retrieveTokenByPrompt(tokenType: TokenType): Promise<string> {
    const {token} = await this.authPrompt(tokenType);

    if (this.isValueInvalid(token)) {
      this.response.error(`Invalid ${tokenType} token.`)
    }

    return token;
  }

  public authPrompt(tokenType: TokenType): Promise<any> {
    return prompt([{
      type: 'password',
      name: 'token',
      message: `Please enter your ${tokenType.valueOf()} token`,
      mask: '•'
    }])
  }

  protected isValueInvalid(text: string): boolean {
    return (text === undefined || text.toString().length == 0);
  }
}



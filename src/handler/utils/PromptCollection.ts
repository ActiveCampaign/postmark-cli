import {prompt} from "inquirer";
import {TokenType} from "../CommandHandler";

export class PromptCollection {
  public auth(tokenType: TokenType): Promise<any> {
    return prompt([{
      type: 'password',
      name: 'token',
      message: `Please enter your ${tokenType.valueOf()} token`,
      mask: '•'
    }])
  }

  public overwrite(directory: string): Promise<any> {
    return prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        default: false,
        message: `Overwrite the files in ${directory}?`,
      }]);
  }

  public confirmation(): Promise<any> {
    return prompt([
      {
        type: 'confirm',
        name: 'confirm',
        default: false,
        message: `Would you like to continue?`,
      },
    ])
  }
}
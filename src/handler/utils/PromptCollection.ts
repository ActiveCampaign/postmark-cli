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
    return this.confirmation(`Overwrite the files in ${directory}?`, 'ovewrite');
  }

  public confirmation(message: string, name: string = 'confirm'): Promise<any> {
    return prompt([
      {
        type: 'confirm',
        name: name,
        default: false,
        message: message,
      },
    ])
  }
}
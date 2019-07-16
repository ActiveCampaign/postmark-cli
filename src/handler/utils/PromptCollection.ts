import {prompt} from "inquirer";
import {TokenTypes} from "../CommandHandler";

export class PromptCollection {
  public auth(tokenType: TokenTypes): Promise<any> {
    return prompt([{
      type: 'password',
      name: 'token',
      message: `Please enter your ${tokenType.valueOf()} token`,
      mask: '•'
    }])
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
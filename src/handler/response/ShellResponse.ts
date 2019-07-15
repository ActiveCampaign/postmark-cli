import {LogSettings} from "../../types/index";
import chalk from "chalk";

export class ShellResponse {
  public respond(message: string, settings?: LogSettings): void {
    this.log(message, settings)
  }

  public error(message: string) {
    this.respond(message, { error: true });
    process.exit(1);
  }

  private log(text: string, settings?: LogSettings): void {
    if (settings && settings.error) {
      return console.error(chalk.red(text))
    }

    if (settings && settings.warn) {
      return console.warn(chalk.yellow(text))
    }

    if (settings && settings.color) {
      return console.log(chalk[settings.color](text))
    }

    return console.log(text)
  }
}
import {CustomLogTypeDetails, LogTypes} from "../../types/index";
import chalk from "chalk";

export class ShellResponse {
  public respond(message: string, type: LogTypes = LogTypes.Info,
                 customLogDetails: CustomLogTypeDetails = { color: 'green'}): void {
    this.log(message, type, customLogDetails)
  }

  public error(message: string) {
    this.respond(message, LogTypes.Error);
    process.exit(1);
  }

  private log(text: string, type: LogTypes, customLogDetails: CustomLogTypeDetails = { color: 'green'}): void {
    return (type === LogTypes.Custom) ? console.log(chalk[customLogDetails.color](text)) : this.logByType(text, type);
  }

  private logByType(text: string, logType: LogTypes) {
    switch (logType) {
      case LogTypes.Success:
        return console.log("✅" + chalk.green(" " + text));
      case LogTypes.Error:
        return console.error("🚫" + chalk.red(" " + text));
      case LogTypes.Warning:
        return console.log("⚠️" + chalk.yellow("  " + text));
      case LogTypes.Info:
        return console.log(text);
    }
  }
}
import {log} from "../../utils";
import {LogSettings} from "../../types/index";
import ora = require("ora");
import {Ora} from "ora";

export class ShellResponse {
  private spinner:Ora|null;

  constructor() {
    this.spinner = null;
  }

  public respondWithSpinner(message: string): void {
    this.spinner = ora(message).start()
  }

  public respond(message: string, settings?: LogSettings): void {
    this.baseResponse(message, settings);
  }

  public error(message: string) {
    this.baseResponse(message, { error: true });
    process.exit(1);
  }

  private baseResponse(message: string, settings?: LogSettings) {
    this.spinnerCheck();
    log(message, settings)
  }

  private spinnerCheck() {
    if (this.spinner !== null) {
      this.spinner.stop();
    }
  }
}
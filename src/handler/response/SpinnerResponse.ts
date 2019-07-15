import ora = require("ora");
import {Ora} from "ora";

export class SpinnerResponse {
  private spinner:Ora;

  constructor() {
    this.spinner = ora();
  }

  public async respond<T>(message: string, action: Promise<T>): Promise<T> {
    this.start(message);
    const response = await action;
    this.stop();
    return response;
  }

  public start(message: string): void {
    this.spinner = ora(message).start();
  }

  public stop() {
    this.spinner.clear();
    this.spinner.stop();
  }
}
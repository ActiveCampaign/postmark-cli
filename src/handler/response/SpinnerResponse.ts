import ora = require("ora");
import {Ora} from "ora";

export class SpinnerResponse {
  private spinner: Ora;

  public constructor() {
    this.spinner = ora();
  }

  public async respond<T>(message: string, action: Promise<T>): Promise<T> {
    try {
      this.start(message);
      const response = await action;
      return response;
    } finally {
      this.stop();
    }
  }

  public start(message: string): void {
    this.spinner = ora(message).start();
  }

  public stop() {
    this.spinner.clear();
    this.spinner.stop();
  }
}
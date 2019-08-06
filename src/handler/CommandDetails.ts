export default class CommandDetails {
  public command: string;
  public description: string;
  public options: any;

  public constructor(command: string, description: string, options: any) {
    this.command = command;
    this.description = description;
    this.options = options;
  }
}
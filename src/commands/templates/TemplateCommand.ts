import {CommandHandler} from "../../handler/CommandHandler";

export abstract class TemplateCommand extends CommandHandler {
  protected readonly layoutDirectory: string = '_layouts';
  protected readonly metadataFilename: string = 'meta.json';
  protected readonly textContentFilename: string = 'content.txt';
  protected readonly htmlContentFilename: string = 'content.html';

  protected constructor(command: string, description: string, options: any) {
    super(command, description, options);
  }
}
import {TemplateCommand} from "./TemplateCommand";

import {
  FileDetails,
  TemplatePushReview,
  TemplateManifest,
  TemplateMetaFile,
  TemplatePushArguments, LogTypes
} from "../../types";

import {pluralize, join, pluralizeWithNumber} from "../../handler/utils/Various";
import {Templates} from "postmark/dist/client/models";
import {TemplateComparisonTable} from "./data/TemplateComparisonTable";

class PushCommand extends TemplateCommand {
  public constructor(command: string, description: string, options: any) {
    super(command, description, options);
  }

  /**
   * Execute push command.
   * @param {TemplatePushArguments} args - push arguments
   * @return {Promise<void>}
   */
  public async execute(args: TemplatePushArguments): Promise<void> {
    let {serverToken, force, templatesdirectory} = args;

    serverToken = await this.validateAndRetrieveToken(serverToken);
    this.setServerClientToUse(serverToken);

    try {
      this.validateTemplatesDirectoryExists(templatesdirectory);
      this.validateLocalTemplatesExist(templatesdirectory);

      const templatesToPush: TemplateManifest[] = this.retrieveTemplatesFromDirectory(templatesdirectory);
      const templatesOnServer: Templates = await this.retrieveTemplatesFromServer();

      this.showTemplatesComparisonOverview(templatesOnServer, templatesToPush);
      if (force || await this.confirmByPrompt()) { await this.pushTemplatesFromDirectory(templatesToPush) }
    } catch (error) {
      this.response.error(error.message)
    }
  }

  /**
   * Get all the templates from server in Postmark account.
   * @return {Promise<Templates>} - list of templates
   */
  public retrieveTemplatesFromServer(): Promise<Templates> {
    return this.spinnerResponse.respond<Templates>('Fetching templates...', this.serverClient.getTemplates());
  }

  private showTemplatesComparisonOverview(templatesOnServer: Templates, templatesToPush: TemplateManifest[]): void {
    const comparison: TemplateComparisonTable = new TemplateComparisonTable();
    const review: TemplatePushReview = comparison.getTemplatesComparisonTable(templatesOnServer, templatesToPush);

    this.response.respond(comparison.getData(review));
    this.response.respond(this.comparisonLabel(
      pluralizeWithNumber(review.templates.length, 'template'),
      pluralizeWithNumber(review.layouts.length, 'layout')
    ), LogTypes.Warning);
  }

  private comparisonLabel(templatesLabel: string, layoutsLabel: string): string {
    let label: string = '';
    label += templatesLabel + ((templatesLabel.length > 0 && layoutsLabel.length > 0) ? ' and ' : '') + layoutsLabel;
    label += ' will be pushed to Postmark.';
    return label;
  }

  /**
   * Push all local template details one by one to Postmark server.
   * @param {TemplateManifest[]} templates - changes to push
   * @return {Promise<void>}
   */
  private async pushTemplatesFromDirectory(templates: TemplateManifest[]): Promise<void> {
    let successfulPushes: number = 0;

    await Promise.all(templates.map( async template => {
      return this.pushTemplateFromDirectory(template).then(result => { if (result === true) { successfulPushes++; }});
    }));

    this.showPushTemplatesFromDirectoryInfo(successfulPushes, templates.length - successfulPushes, templates.length);
  }

  /**
   * Push single local template details to Postmark server.
   * @param template - changes to push
   * @return {Promise<boolean>}
   */
  private async pushTemplateFromDirectory(template: any): Promise<boolean> {
    try {
      if (template.New) {
        await this.serverClient.createTemplate(template) }
      else {
        await this.serverClient.editTemplate(template.Alias, template);
      }

      return true;
    } catch (error) {
      this.response.error(`\n${template.Alias}: ${error.toString()}`)
      return false;
    }
  }

  private showPushTemplatesFromDirectoryInfo(pushes: number, failedPushes: number, templatesCount: number): void {
    if (pushes === templatesCount) {
      this.response.respond('All finished!', LogTypes.Success)
    }
    else {
      this.response.error(
        `Failed to push ${failedPushes} ${pluralize(failedPushes, 'template')}. ` +
        `Please see the output above for more details.`)
    }
  }
}

const options: any = {
  'server-token': {
    type: 'string',
    hidden: true,
  },
  force: {
    type: 'boolean',
    describe: 'Disable confirmation before pushing templates',
    alias: 'f',
  },
};

const commandHandler: PushCommand = new PushCommand(
  'push <templates directory> [options]',
  'Push templates from <templates directory> to a Postmark server',
  options
);

export const command = commandHandler.details.command;
export const desc = commandHandler.details.description;
export const builder = commandHandler.details.options;
export const handler = (args: any): Promise<void> => commandHandler.execute(args);
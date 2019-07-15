import {TokenType} from "../../handler/CommandHandler";

import {
  FileDetails,
  TemplatePushReview,
  TemplateManifest,
  TemplateMetaFile,
  TemplatePushArguments
} from "../../types";

import {join} from "path";
import {find} from 'lodash'
import chalk from "chalk";
import {pluralize} from "../../handler/utils/Various";
import {TemplateCommand} from "./TemplateCommand";
import {Template, Templates} from "postmark/dist/client/models";
import {ComparisonTable} from "./data/ComparisonTable";

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

    serverToken = await this.authenticateByToken(serverToken, TokenType.Server);
    this.setServerClientToUse(serverToken);

    try {
      this.validateTemplatesDirectoryExists(templatesdirectory);
      this.validateLocalTemplatesExist(templatesdirectory);

      const templatesToPush: TemplateManifest[] = this.retrieveTemplatesFromDirectory(templatesdirectory);
      const templatesOnServer: Templates = await this.retrieveTemplatesFromServer();

      this.showTemplatesComparisonOverview(templatesOnServer, templatesToPush);
      if (force || await this.confirmation()) { await this.pushTemplatesFromDirectory(templatesToPush) }
    } catch (error) {
      this.response.error(error.message)
    }
  }

  private validateTemplatesDirectoryExists(path: string): void {
    if (!this.fileUtils.directoryExists(path)) {
      throw Error('Templates folder does not exist');
    }
  }

  private validateLocalTemplatesExist(directory: string): void {
    if (!this.fileUtils.directoryExists(directory)) {
      throw Error('No templates or layouts were found.');
    }
  }

  /**
   * Get all the templates from server in Postmark account.
   * @return {Promise<Templates>} - list of templates
   */
  public retrieveTemplatesFromServer(): Promise<Templates> {
    return this.spinnerResponse.respond<Templates>('Fetching templates...', this.serverClient.getTemplates());
  }

  /**
   * Get all the local templates details on your machine.
   * @param {string} path - folder where templates are stored
   * @return {TemplateManifest[]} - list of templates
   */
  public retrieveTemplatesFromDirectory(path: string): TemplateManifest[] {
    let localTemplatesToPush: TemplateManifest[] = [];
    const metaFiles: FileDetails[] = this.fileUtils.findFiles(path, this.metadataFilename);

    metaFiles.forEach((file: FileDetails) => {
      const item: TemplateMetaFile | null = this.retrieveTemplateFromFile(this.fileUtils.directoryPath(file.path));
      if (item) localTemplatesToPush.push(item)
    });

    return localTemplatesToPush;
  }

  /**
   * Get details of the template stored in a directory.
   * @param {string} directory - where template is stored
   * @return {TemplateMetaFile | null} - template details
   */
  public retrieveTemplateFromFile(directory: string): TemplateMetaFile | null {
    const metaFilePath: string = join(directory, this.metadataFilename);
    const htmlPath: string = join(directory, this.htmlContentFilename);
    const textPath: string = join(directory, this.textContentFilename);

    if (this.fileUtils.fileExists(metaFilePath)) {
      const metaFile: TemplateMetaFile = this.fileUtils.readToJSON(metaFilePath);
      const htmlFile: string = this.fileUtils.directoryExists(htmlPath) ? this.fileUtils.readFile(htmlPath) : '';
      const textFile: string = this.fileUtils.directoryExists(textPath) ? this.fileUtils.readFile(textPath) : '';

      return {HtmlBody: htmlFile, TextBody: textFile, ...metaFile};
    }
    else {
      return null;
    }
  }

  private showTemplatesComparisonOverview(templatesOnServer: Templates, templatesToPush: TemplateManifest[]): void {
    let compare: ComparisonTable = new ComparisonTable();
    let review: TemplatePushReview = this.compareTemplates(templatesOnServer, templatesToPush);
    this.response.respond(compare.drawComparisonPreviewTable(review));

    this.response.respond(chalk.yellow(
      this.comparisonLabel( this.labelName(review.templates.length, 'template'), this.labelName(review.layouts.length, 'layout'))));
  }

  private comparisonLabel(templatesLabel: string, layoutsLabel: string): string {
    let label: string = '';
    label += templatesLabel + ((templatesLabel.length > 0 && layoutsLabel.length > 0) ? ' and ' : '') + layoutsLabel;
    label += ' will be pushed to Postmark.';
    return label;
  }

  private compareTemplates(templatesOnServer: Templates, templatesToPush: TemplateManifest[]): TemplatePushReview {
    let review: TemplatePushReview = {layouts: [], templates: []};

    templatesToPush.forEach(template => {
      const templateOnServerFound: Template|undefined = this.findLocalTemplateOnServer(templatesOnServer, template);

      const reviewData: string[] = [
        !templateOnServerFound ? 'Added' : 'Modified',
        template.Name || '',
        template.Alias || '',
      ];

      if (template.TemplateType === 'Standard') {
        reviewData.push(template.LayoutTemplate? template.LayoutTemplate : 'None');
        review.templates.push(reviewData)
      } else {
        review.layouts.push(reviewData)
      }
    });

    return review;
  }

  private findLocalTemplateOnServer(templatesOnServer: any, templateToPush: TemplateManifest): Template|undefined {
    return find<Template>(templatesOnServer.Templates, {Alias: templateToPush.Alias});
  }

  private labelName(number: number, name: string): string {
    return number > 0 ? `${number} ${pluralize(number, name)}` : '';
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

    this.pushTemplatesFromDirectoryResponse(successfulPushes, templates.length - successfulPushes, templates.length);
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

  private pushTemplatesFromDirectoryResponse(pushes: number, failedPushes: number, templatesCount: number): void {
    if (pushes === templatesCount) {
      this.response.respond('✅ All finished!', {color: 'green'})
    }
    else {
      this.response.error(
        `⚠️ Failed to push ${failedPushes} ${pluralize(failedPushes, 'template')}. ` +
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

const commandHandler: PushCommand = new PushCommand('push <templates directory> [options]',
  'Push templates from <templates directory> to a Postmark server', options);

export const command = commandHandler.details.command;
export const desc = commandHandler.details.description;
export const builder = commandHandler.details.options;
export const handler = (args: any): Promise<void> => commandHandler.execute(args);
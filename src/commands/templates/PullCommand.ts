import {TemplateCommand} from "./TemplateCommand";
import {LogTypes, TemplateMetaFile, TemplatePullArguments} from "../../types";
import {pluralize, join} from "../../handler/utils";
import * as pm from "postmark";

class PullCommand extends TemplateCommand {
  public constructor(command: string, description: string, options: any) {
    super(command, description, options);
  }

  public async execute(args: TemplatePullArguments): Promise<void> {
    let {serverToken, overwrite, outputdirectory} = args;

    serverToken = await this.validateAndRetrieveToken(serverToken);
    this.setServerClientToUse(serverToken);

    if (await this.isPullTemplatesPossible(outputdirectory, overwrite)) {
      return this.pullTemplatesToDirectory(outputdirectory);
    }
  }

  public async isPullTemplatesPossible(directory: string, overwrite: boolean): Promise<boolean> {
    if (this.fileUtils.directoryExists(directory) && !overwrite) {
      return this.confirmByPrompt(`Overwrite the files in ${directory}?`)
    }
    else {
      return true;
    }
  }

  /**
   * Pull all the templates from a Postmark server to a local directory.
   *
   * @param {string} outputDirectory - directory to pull templates to
   * @return {Promise<void>}
   */
  public async pullTemplatesToDirectory(outputDirectory: string): Promise<void> {
    try {
      const templates: pm.Models.Templates = await this.spinnerResponse.respond<pm.Models.Templates>('Fetching templates...',
        this.serverClient.getTemplates());
      this.validateTemplatesExistOnServer(templates);

      const templatesWithAlias: any[] = this.retrieveTemplatesByAlias(templates, true);
      const templateNamesWithNoAlias: any[] = this.retrieveTemplatesByAlias(templates, false)
                                                  .map( template => template.Name);

      if (templateNamesWithNoAlias.length > 0) { this.showTemplatesWithNoAliasWarning(templateNamesWithNoAlias); }
      await this.saveTemplatesAction(templatesWithAlias, outputDirectory)
    } catch (error) {
      this.response.error(error.message)
    }
  }

  private retrieveTemplatesByAlias(templates: pm.Models.Templates, aliasAvailable: boolean): any[] {
    return templates.Templates.filter( template => !!template.Alias === aliasAvailable)
  }

  private validateTemplatesExistOnServer(templates: pm.Models.Templates): void {
    if (templates.TotalCount === 0) {
      throw Error('There are no templates on this server.');
    }
  }

  private showTemplatesWithNoAliasWarning(templateNamesWithNoAlias: string[]): void {
    let message = 'Templates with following names will not be downloaded because they are missing an alias:\n';
    this.response.respond(message, LogTypes.Warning);
    this.response.respond(templateNamesWithNoAlias.join("\n") + "\n", LogTypes.Info)
  }

  private async saveTemplatesAction(templates: any, outputDirectory: string) {
    await this.spinnerResponse.respond<void>(`Saving templates to folder '${outputDirectory}'...`,
      this.saveTemplatesToDirectory(templates, outputDirectory));
      this.showSavedTemplatesInfo(templates.length, outputDirectory)
  }

  /**
   * Save all templates to directory.
   *
   * @param {any[]} templates - templates list
   * @param {string} outputDir - directory to pull templates to.
   * @return {Promise<void>}
   */
  private async saveTemplatesToDirectory(templates: any[], outputDir: string): Promise<void> {
    for(let i=0;i<templates.length;i++) {
      const templateDetails: pm.Models.Template = await this.serverClient.getTemplate(templates[i].TemplateId);
      this.saveTemplateToDirectory(outputDir, templateDetails);
    }
  }

  /**
   * Save single template to directory.
   *
   * @param {string} outputDirBase - directory to pull template to.
   * @param {Template} template - single template
   */
  private saveTemplateToDirectory(outputDirBase: string, template: pm.Models.Template): void {
    const outputDir = this.retrieveOutputDir(outputDirBase, template.TemplateType);
    const alias: string = (template.Alias !== null && template.Alias !== undefined) ? template.Alias: '';
    const templatePath = this.fileUtils.directoryFullPath(join(outputDir, alias));

    this.fileUtils.ensureDirectoryExists(templatePath);
    this.saveTemplateContentToDirectory(templatePath, template.HtmlBody, template.TextBody);
    this.saveTemplateMetadataToDirectory(templatePath, template);
  }

  private saveTemplateContentToDirectory(path: string, htmlContent: string | undefined, textContent: string | undefined) {
    if (htmlContent !== '') { this.fileUtils.saveFile(join(path, this.htmlContentFilename), htmlContent) }
    if (textContent !== '') { this.fileUtils.saveFile(join(path, this.textContentFilename), textContent) }
  }

  private saveTemplateMetadataToDirectory(path: string, template: pm.Models.Template) {
    const alias: string = (template.Alias !== null && template.Alias !== undefined) ? template.Alias: '';

    const meta: TemplateMetaFile = { Name: template.Name, Alias: alias,
      ...(template.Subject && { Subject: template.Subject }),
      TemplateType: template.TemplateType ? template.TemplateType : '',
      ...(template.TemplateType === 'Standard' && {
        LayoutTemplate: template.LayoutTemplate,
      }),
    };

    this.fileUtils.saveFile(join(path, this.metadataFilename), this.getFormattedData(meta))
  }

  private retrieveOutputDir(outputDir: string,
                            templateType: pm.Models.TemplateTypes = pm.Models.TemplateTypes.Standard): string {
    return templateType === pm.Models.TemplateTypes.Layout ? join(outputDir,this.layoutDirectory) : outputDir;
  }

  private showSavedTemplatesInfo(templatesSavedCount: number, outputDirectory: string) {
    const message: string = `All finished! ${templatesSavedCount} ` +
      `${pluralize(templatesSavedCount, 'template has', 'templates have')}` +
      ` been saved to ${outputDirectory}.`;
    this.response.respond(message, LogTypes.Success)
  }

}

const options: any = {
  'server-token': {
    type: 'string',
    hidden: true,
  },
  overwrite: {
    type: 'boolean',
    alias: 'o',
    default: false,
    describe: 'Overwrite templates if they already exist',
  },
};

const commandHandler: PullCommand = new PullCommand(
  'pull <output directory> [options]',
  'Pull templates from a server to <output directory>',
  options
);

export const command = commandHandler.details.command;
export const desc = commandHandler.details.description;
export const builder = commandHandler.details.options;
export const handler = (args: any): Promise<void> => commandHandler.execute(args);
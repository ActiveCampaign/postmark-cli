import {TemplateMetaFile} from "../../types";
import {TemplatePullArguments} from "../../types/Template";
import {TokenType} from "../../handler/CommandHandler";
import {TemplateCommand} from "./TemplateCommand";
import {Templates, Template, TemplateTypes} from "postmark/dist/client/models";
import {pluralize} from "../../handler/utils/Various";
import {join} from "path";

class PullCommand extends TemplateCommand {
  public constructor(command: string, description: string, options: any) {
    super(command, description, options);
  }

  public async execute(args: TemplatePullArguments): Promise<void> {
    let {serverToken, overwrite, outputdirectory} = args;

    serverToken = await this.authenticateByToken(serverToken, TokenType.Server);
    this.setServerClientToUse(serverToken);

    const pullTemplates: boolean = await this.isPullTemplatesPossible(outputdirectory, overwrite);
    if (pullTemplates === true) { return this.pullTemplatesToDirectory(outputdirectory); }
  }

  private isPullTemplatesPossible(directory: string, overwrite: boolean): Promise<boolean> {
    return new Promise( (resolve, reject) => {
      if (this.fileUtils.directoryExists(directory) && !overwrite) {
        this.prompts.overwrite(directory).then( answer => { (!!answer.overwrite) ? resolve(true) : reject(false) })
      }
      else {
        resolve(true)
      }
    })
  }

  private async pullTemplatesToDirectory(outputDirectory: string): Promise<void> {
    try {
      const templates: Templates = await this.spinnerResponse.respond<Templates>('Fetching templates...',
        this.serverClient.getTemplates());
      const templatesWithAlias = this.templatesWithAlias(templates);
      const templateNamesWithNoAlias = this.templateNamesWithNoAlias(templates);

      this.validateTemplatesExistOnServer(templates);
      this.showTemplatesWithNoAliasWarning(templateNamesWithNoAlias);
      await this.saveTemplatesAction(templatesWithAlias, outputDirectory)
    } catch (error) {
      this.response.error(error.message)
    }
  }

  private templateNamesWithNoAlias(templates: Templates):string[] {
    return templates.Templates.filter( template => !template.Alias ).map( template => template.Name)
  }

  private templatesWithAlias(templates: Templates): any[] {
    return templates.Templates.filter( template => !!template.Alias )
  }

  private validateTemplatesExistOnServer(templates: Templates): void {
    if (templates.TotalCount === 0) {
      throw Error('There are no templates on this server.');
    }
  }

  private showTemplatesWithNoAliasWarning(templateNamesWithNoAlias: string[]): void {
    if (templateNamesWithNoAlias.length > 0) {
      let message = 'Templates with following names will not be downloaded because they are missing an alias:\n';
      message += templateNamesWithNoAlias.join("\n");
      this.response.respond(message, {warn: true});
    }
  }

  private async saveTemplatesAction(templates: any, outputDirectory: string) {
    await this.spinnerResponse.respond<void>(`Saving templates to folder '${outputDirectory}'...`,
      this.saveTemplatesToDirectory(templates, outputDirectory));

    const message: string = `All finished! ${templates.length} ` +
                            `${pluralize(templates.length, 'template has', 'templates have')}` +
                            ` been saved to ${outputDirectory}.`;
    this.response.respond(message, {color: 'green'})
  }

  private async saveTemplatesToDirectory(templates: any[], outputDir: string):Promise<void> {
    for(let i=0;i<templates.length;i++) {
      const templateDetails: Template = await this.serverClient.getTemplate(templates[i].TemplateId);
      this.saveTemplateToDirectory(outputDir, templateDetails);
    }
  }

  private saveTemplateToDirectory(outputDirBase: string, template: Template):void {
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

  private saveTemplateMetadataToDirectory(path: string, template: Template) {
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

  private retrieveOutputDir(outputDir: string, templateType: TemplateTypes = TemplateTypes.Standard): string {
    return templateType === TemplateTypes.Layout ? join(outputDir,this.layoutDirectory) : outputDir;
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

const commandHandler: PullCommand = new PullCommand('pull <output directory> [options]',
                                                    'Pull templates from a server to <output directory>', options);

export const command = commandHandler.details.command;
export const desc = commandHandler.details.description;
export const builder = commandHandler.details.options;
export const handler = (args: any): Promise<void> => commandHandler.execute(args);
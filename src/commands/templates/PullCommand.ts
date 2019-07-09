import {ServerRequest, TokenType} from "../../handler/requests/ServerRequest";
import {CommandHandler} from "../../handler/CommandHandler";
import {TemplatePullArguments} from "../../types/Template";
import {Templates} from "postmark/dist/client/models";
import {join} from "path";
import untildify from "untildify";
import {MetaFile} from "../../types";
import {ensureDirSync, outputFileSync} from "fs-extra";
import {pluralize} from "../../utils";
import {Template} from "../../types/Template";

class PullCommand extends CommandHandler {
  public constructor(command: string, description: string, options: any) {
    super(command, description, options);
  }

  public async execute(args: TemplatePullArguments): Promise<void> {
    let {serverToken} = args;
    const { outputdirectory, overwrite } = args;
    serverToken = await this.authenticateByToken(serverToken, TokenType.Server);

    const data: Templates|undefined = await this.executeRequest<Templates>('Fetching data...',
      new ServerRequest(serverToken).getTemplates());

    if (data!== undefined) {
      if (data.TotalCount === 0) {
        this.response.error('There are no templates on this server.')
      }
      else {
        this.templatesWithNoAliasCheck(data);

        const templatesWithAlias = this.templatesWithAlias(data);
        await this.saveTemplates(templatesWithAlias, outputdirectory, serverToken);

        this.response.respond(`All finished! ${templatesWithAlias.length} ${
          pluralize(templatesWithAlias.length, 'template has', 'templates have')} been saved to ${outputdirectory}.`)
      }
    }
  }

  private templatesWithNoAliasCheck(data: Templates): void {
    const templatesWithNoAlias = this.templatesWithNoAlias(data);
    if (templatesWithNoAlias.length > 0) {
      const message = 'Templates with following names will not be downloaded because they are missing an alias:\n';
      this.response.respond(message, {warn: true});
      this.response.respond(this.templatesWithNoAlias(data).join("\n"), {warn: true});
    }
  }

  private templatesWithNoAlias(data: Templates):string[] {
    return data.Templates.filter( template => !template.Alias ).map( template => template.Name)
  }

  private templatesWithAlias(data: Templates): any[] {
    return data.Templates.filter( template => !!template.Alias )
  }

  private async saveTemplates(templates: any[], outputDir: string, serverToken: string):Promise<void> {
    this.response.respondWithSpinner(`Save templates to folder '${outputDir}'`);

    for(let i=0;i<templates.length;i++) {
      const templateDetails: any = await new ServerRequest(serverToken).getTemplate(templates[i].TemplateId);

      if (templateDetails !== undefined) {
        this.saveTemplate(outputDir, templateDetails);
      }
    }
  }


  private saveTemplate(outputDir: string, template: Template) {
    outputDir = template.TemplateType === 'Layout' ? join(outputDir, '_layouts') : outputDir;

    let alias: string = '';
    if (template.Alias !== null && template.Alias !== undefined) {
      alias = template.Alias;
    }

    const path = untildify(join(outputDir, alias));

    ensureDirSync(path);

    // Save HTML version
    if (template.HtmlBody !== '') { outputFileSync(join(path, 'content.html'), template.HtmlBody) }

    // Save Text version
    if (template.TextBody !== '') { outputFileSync(join(path, 'content.txt'), template.TextBody) }

    const meta: MetaFile = { Name: template.Name, Alias: alias,
      ...(template.Subject && { Subject: template.Subject }),
      TemplateType: template.TemplateType,
      ...(template.TemplateType === 'Standard' && {
        LayoutTemplate: template.LayoutTemplate,
      }),
    }

    outputFileSync(join(path, 'meta.json'), JSON.stringify(meta, null, 2))
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
}

const commandHandler: PullCommand = new PullCommand('pull2 <output directory> [options]',
                                                    'Pull2 templates from a server to <output directory>', options);

export const command = commandHandler.details.command;
export const desc = commandHandler.details.description;
export const builder = commandHandler.details.options;
export const handler = (args: any): Promise<void> => commandHandler.execute(args);
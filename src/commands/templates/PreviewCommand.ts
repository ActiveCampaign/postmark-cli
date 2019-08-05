import {TemplateCommand} from "./TemplateCommand";
import {
  TemplateManifest,
  TemplatePreviewArguments,
} from "../../types";

import { filter, find, replace } from 'lodash'
import untildify = require("untildify");
import express from 'express'
import consolidate from 'consolidate'

class PreviewCommand extends TemplateCommand {
  public constructor(command: string, description: string, options: any) {
    super(command, description, options);
  }

  public async execute(args: TemplatePreviewArguments): Promise<void> {
    let {port, templatesdirectory} = args;

    this.validateTemplatesDirectoryExists(templatesdirectory);
    this.retrieveTemplatesFromDirectory(templatesdirectory);
    this.preview(templatesdirectory, port);
  }

  private preview(directory: string, port: number) {
    const app = express();

    app.use(express.static('preview/assets'));

    app.get('/', (req, res) => {
      const templates = this.compileTemplatesFromFolder(directory);

      consolidate.ejs(
        'preview/index.html',
        {
          templates: filter(templates, { TemplateType: 'Standard' }),
          layouts: filter(templates, { TemplateType: 'Layout' }),
          path: untildify(directory),
        },
        (err, html) => {
          if (err) res.send(err);
          return res.send(html);
        }
      )
    });

    app.get('/:alias', (req, res) => {
      const templates = this.compileTemplatesFromFolder(directory);
      const template: any = find(templates, { Alias: req.params.alias });

      consolidate.ejs(
        'preview/template.html',
        { template: template },
        (err, html) => {
          if (err) res.send(err)
          return res.send(html)
        }
      )
    });

    app.get('/html/:alias', (req, res) => {
      const templates = this.compileTemplatesFromFolder(directory);
      const template: any = find(templates, { Alias: req.params.alias });

      if (template && template.HtmlBody) {
        return res.send(template.HtmlBody)
      }
      else {
        return res.status(404)
      }
    });

    app.get('/text/:alias', (req, res) => {
      const templates = this.compileTemplatesFromFolder(directory);
      const template: any = find(templates, { Alias: req.params.alias });

      if (template && template.TextBody) {
        res.set('Content-Type', 'text/plain');
        res.write(template.TextBody);
        return res.end();
      }
      else {
        return res.status(404)
      }
    });

    app.listen(port, () =>
      console.log(`Previews available at http://localhost:${port}!`)
    )
  }

  private compileTemplatesFromFolder(directory: string):any {
    const templates: TemplateManifest[]= this.retrieveTemplatesFromDirectory(directory);
    return this.compileTemplates(templates);
  }

  private compileTemplates(manifest: TemplateManifest[]): any {
    let compiled: any = [];
    const layouts = filter(manifest, { TemplateType: 'Layout' });
    const templates = filter(manifest, { TemplateType: 'Standard' });

    templates.forEach(template => {
      const layout = find(layouts, { Alias: template.LayoutTemplate || '' });

      if (!layout) return;
      if (!layout.HtmlBody && !layout.TextBody) return;

      compiled.push({
        ...template,
        HtmlBody: this.compileTemplate(layout.HtmlBody || '', template.HtmlBody || ''),
        TextBody: this.compileTemplate(layout.TextBody || '', template.TextBody || ''),
      })
    });

    layouts.forEach(layout => {
      if (!layout.HtmlBody && !layout.TextBody) return
      const content = 'Template content is inserted here.'

      compiled.push({
        ...layout,
        HtmlBody: this.compileTemplate(layout.HtmlBody || '', content),
        TextBody: this.compileTemplate(layout.TextBody || '', content),
      })
    });

    return compiled;
  }

  public compileTemplate(layout: string, template: string): string {
    return replace(layout, /({{{)(.?@content.?)(}}})/g, template);
  }
}

const options: any = {
  port: {
    type: 'number',
    describe: 'The port to open up the preview server on',
    default: '3005',
    alias: 'p',
  },
};

const commandHandler: PreviewCommand = new PreviewCommand(
  'preview  <templates directory> [options]',
  'Preview your templates and layouts together',
  options
);

export const command = commandHandler.details.command;
export const desc = commandHandler.details.description;
export const builder = commandHandler.details.options;
export const handler = (args: any): Promise<void> => commandHandler.execute(args);
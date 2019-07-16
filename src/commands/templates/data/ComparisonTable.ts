import {getBorderCharacters, table} from "table";
import {Chalk} from "chalk";
import {TemplateManifest, TemplatePushReview} from "../../../types";
import chalk from "chalk";
import {pluralize, find} from "../../../handler/utils/Various";
import {Template, Templates} from "postmark/dist/client/models";

export class ComparisonTable {
  public drawComparisonPreviewTable(review: TemplatePushReview): string {
    this.colorizeTableElements(review.templates, {'Modified': chalk.green, 'Added': chalk.yellow, 'None': chalk.gray});
    this.colorizeTableElements(review.layouts, {'Modified': chalk.green, 'Added': chalk.yellow, 'None': chalk.gray});

    return this.getComparisonTables(review);
  }

  public getTemplatesComparisonTable(templatesOnServer: Templates, templatesToPush: TemplateManifest[]): TemplatePushReview {
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

  private colorizeTableElements(elements: any[][], paint: any): any[][] {
    for(let i=0;i<elements.length;i++) {
      for(let j=0;j<elements.length;j++) {
        const element = elements[i][j];
        const color: Chalk = paint[element];
        if (!!color) {
          elements[i][j] = color(element);
        }
      }
    }
    return elements;

  }

  private getComparisonTables(review: TemplatePushReview): string {
    const {templates, layouts} = review;
    const baseHeader: string[] = [chalk.gray('Change'), chalk.gray('Name'), chalk.gray('Alias')];

    let result: string = '';
    result += this.drawElementsTable(templates, [...baseHeader, chalk.gray('Layout used')], 'template');
    result += this.drawElementsTable(layouts, baseHeader, 'layout');
    return result;
  }

  private drawElementsTable(elements: any, header: string[], type: string): string {
    let result = '';
    if (elements.length > 0) {
      result += `\n${this.labelName(elements.length, type)}\n`;
      result += table([header, ...elements], {border: getBorderCharacters('norc')});
    }

    return result;
  }

  private labelName(number: number, name: string): string {
    return number > 0 ? `${number} ${pluralize(number, name, name + 's')}` : '';
  }

  private layoutUsedLabel(localLayout: string | null | undefined, serverLayout: string | null | undefined): string {
    let label: string = localLayout ? localLayout : chalk.gray('None');

    // If layout template on server doesn't templateOnServerFound local template
    if (localLayout !== serverLayout) {
      serverLayout = serverLayout ? serverLayout : 'None';

      // Append old server layout to label
      label += chalk.red(`  ✘ ${serverLayout}`)
    }

    return label
  }
}
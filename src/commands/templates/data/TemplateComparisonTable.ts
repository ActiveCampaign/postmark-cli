import chalk from "chalk";
import {TableFormat} from "../../../handler/data/index";
import {find, pluralizeWithNumber} from "../../../handler/utils/Various";
import {TemplateManifest, TemplatePushReview} from "../../../types";
import {Template, Templates} from "postmark/dist/client/models";

/**
 * Represents class for transforming differences between local and Postmark account templates into a styled table.
 */
export class TemplateComparisonTable extends TableFormat{
  public getData(review: TemplatePushReview): string {
    this.colorizeTableElements(review.templates, this.tableElementColors());
    this.colorizeTableElements(review.layouts, this.tableElementColors());
    return this.getComparisonTables(review);
  }

  private getComparisonTables(review: TemplatePushReview): string {
    return this.getTemplatesTable(review.templates) + this.getLayoutTable(review.layouts);
  }

  private getTemplatesTable(templates: any): string {
    return this.getFormattedTable(templates, ['Change', 'Name', 'Alias', 'Layout used'], 'template');
  }

  private getLayoutTable(layouts: any): string {
    return this.getFormattedTable(layouts, ['Change', 'Name', 'Alias'], 'layout');
  }

  /**
   * Retrieve comparison tables for all template types.
   * @param {Templates} templatesOnServer
   * @param {TemplateManifest[]} templatesToPush
   * @return {TemplatePushReview}
   */
  public getAllTemplatesComparisonTable(templatesOnServer: Templates,
                                        templatesToPush: TemplateManifest[]): TemplatePushReview {
    return {
      layouts: this.getLayoutsComparisonTable(templatesOnServer, templatesToPush),
      templates: this.getTemplatesComparisonTable(templatesOnServer, templatesToPush)
    };
  }

  public getTemplatesComparisonTable(templatesOnServer: Templates, templatesToPush: TemplateManifest[]): any[] {
    let data: any[] = [];

    this.retrieveTemplatesToPushByType('template', templatesToPush).forEach(template => {
      const reviewData: string[] = this.generateBaseComparisonElements(template, templatesOnServer);
        reviewData.push(template.LayoutTemplate ? template.LayoutTemplate : 'None');
        data.push(reviewData)
    });

    return data;
  }

  public getLayoutsComparisonTable(templatesOnServer: Templates, templatesToPush: TemplateManifest[]): any[] {
    let data: any[] = [];

    this.retrieveTemplatesToPushByType('layout', templatesToPush).forEach(template => {
      const reviewData: string[] = this.generateBaseComparisonElements(template, templatesOnServer);
      data.push(reviewData)
    });

    return data;
  }

  /**
   * Get all the elements by a type.
   *
   * @param {"layout" | "template"} type
   * @param {TemplateManifest[]} templates
   * @return {TemplateManifest[]}
   */
  public retrieveTemplatesToPushByType(type: 'layout' | 'template', templates: TemplateManifest[]) {
    if (type === 'template') {
      return templates.filter( t => t.TemplateType === 'Standard')
    }
    else {
      return templates.filter( t => t.TemplateType !== 'Standard')
    }
  }

  /**
   *  Retrieves base template differences
   * @param template - local template comparing
   * @param {Templates} templatesOnServer - server template
   * @return {string[]} - difference details
   */
  public generateBaseComparisonElements(template: any, templatesOnServer: Templates): string[] {
    const templateOnServerFound: Template|undefined = this.findLocalTemplateOnServer(templatesOnServer, template);
    return [!templateOnServerFound ? 'Added' : 'Modified', template.Name || '', template.Alias || ''];
  }

  /**
   * Table fully formatted with header, title, content
   *
   * @param elements - table elements
   * @param {string[]} header - table header
   * @param {string} type - type of table
   * @return {string} - formatted table in string representation
   */
  private getFormattedTable(elements: any, header: string[], type: 'layout'| 'template'): string {
    return (elements.length > 0) ? this.getTable(header,elements, pluralizeWithNumber(elements.length, type)) : '';
  }

  /**
   * Try to find a local template on a server.
   *
   * @param templatesOnServer - server template details
   * @param {TemplateManifest} templateToPush - local template to push details
   * @return {Template | undefined} - template details if exists on server
   */
  private findLocalTemplateOnServer(templatesOnServer: any, templateToPush: TemplateManifest): Template|undefined {
    return find<Template>(templatesOnServer.Templates, {Alias: templateToPush.Alias});
  }

  /**
   * Color style for specific words.
   * @return {any} - specification for which word to match which color.
   */
  private tableElementColors(): any {
    return {'Modified': chalk.green, 'Added': chalk.yellow, 'None': chalk.gray};
  }
}
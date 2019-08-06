import {DataFormat} from "./DataFormat";
import {getBorderCharacters, table} from "table";
import chalk, {Chalk} from "chalk";

/**
 * This class represents the base class for any table that we would like to create.
 * It allows you to create a table with specific style settings, like default header style.
 */
export abstract class TableFormat extends DataFormat {
  private readonly tableBorder = { border: getBorderCharacters('norc') };
  public abstract getData(data: any): string;

  /**
   * Get data transformed into a formatted string table to display.
   *
   * @param {string[]} header - text of the table header
   * @param data - data to transform into table data
   * @param {string} tableTitle - title of the table to be displayed before the table
   * @return {string} - complete table representation transformed into a string
   */
  protected getTable(header: string[], data: any, tableTitle: string = ''): string {
    this.colorizeHeader(header);
    return this.prepareTableTitle(tableTitle) + table([header, ...data], this.tableBorder);
  }

  /**
   * Retrieve title that should be displayed before the table
   *
   * @param {string} tableTitle - title to use
   * @return {string} - string representation of the title
   */
  private prepareTableTitle(tableTitle: string): string {
    return (tableTitle === '') ? '' : "\n" + chalk.white.bold(tableTitle) + "\n";
  }

  /**
   * Header of the table needs to be formatted differently from other table elements.
   * This method takes care od that.
   *
   * @param {string[]} header - header to transform
   */
  protected colorizeHeader(header: string[]): void {
    for(let i=0; i< header.length; i++) {
      header[i] = chalk.white.bold(header[i]);
    }
  }

  /**
   * In case we would like to adjust color of some of the elements in the table, this method allows us to do that.
   *
   * @param {any[][]} elements - table elements to check
   * @param paint - color to paint to
   * @return {any[][]} - colorized table
   */
  protected colorizeTableElements(elements: any[][], paint: any): any[][] {
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
}

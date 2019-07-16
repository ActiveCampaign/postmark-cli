import {DataFormat} from "./DataFormat";
import {getBorderCharacters, table} from "table";
import chalk, {Chalk} from "chalk";

export abstract class TableFormat extends DataFormat {
  private readonly tableBorder = { border: getBorderCharacters('norc') };
  public abstract transform(data: any): string;

  protected getTable(header: string[], data: any): string {
    this.colorizeHeader(header);
    return table([header, ...data], this.tableBorder);
  }

  protected colorizeHeader(header: string[]) {
    for(let i=0; i< header.length; i++) {
      header[i] = chalk.white.bold(header[i]);
    }
  }

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

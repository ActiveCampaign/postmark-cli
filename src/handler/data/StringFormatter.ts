import chalk from "chalk";

export class StringFormatter {
  private value: string;

  public static get(): StringFormatter {
    return new StringFormatter();
  }

  constructor(value: string = '') {
    this.value = value;
  }

  public appendValue(value: string): this {
    this.value += this.formatString(value);
    return this;
  }

  public appendColoredHexValue(value: string, color: string): this {
    this.value += chalk.bgHex(color)(this.formatString(value));
    return this;
  }

  public appendColoredValue(value: string, color?: 'green' | 'white' | 'gray'): this {
    if (color === undefined) { color = this.getReservedWordColor(this.formatString(value)) }

    this.value += (<any>chalk)[color](value);
    return this;
  }

  public appendWhitespace(charCount: number = 1): this {
    this.value += ' '.repeat(charCount);
    return this;
  }

  public appendLine(lineCount: number = 1): this {
    this.value += "\n".repeat(lineCount);
    return this;
  }

  public retrieveStringValue():string {
      return this.value;
  }

  public getReservedWordValue(value: any): string {
    switch (value) {
      case true:
        return 'Enabled';
      case false:
        return 'Disabled';
      case 'TextOnly':
        return 'Text';
      case 'HtmlOnly':
        return 'HTML';
      case 'HtmlAndText':
        return 'HTML and Text';
      default:
        return value;
    }
  }

  public getReservedWordColor(value: string): 'green' | 'white' | 'gray' {
    switch (value) {
      case 'Enabled':
        return 'green';
      case 'Disabled':
        return 'gray';
      case 'Text':
        return 'green';
      case 'HTML':
        return 'green';
      case 'HTML and Text':
        return 'green';
      case 'None':
        return 'gray';
      default:
        return 'white';
    }
  }
  
  private formatString(value: string): string {
      value = value.trim().length === 0 ? value : value.trim();
      if (value.includes(':')) { value+= ' ' }
      return value;
  }
}
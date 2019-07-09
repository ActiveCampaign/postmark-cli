import {Server, Servers} from "postmark/dist/client/models";
import chalk from "chalk";
import {ColorMap} from "../../../types/index";
import {getBorderCharacters, table} from "table";
import {DataFormat} from "../../../handler/data/DataFormat";

export class ServerTableFormat extends DataFormat {
  public static ServerColors: ColorMap = {
    purple: '#9C73D2',
    blue: '#21CDFE',
    turquoise: '#52F3ED',
    green: '#3BE380',
    red: '#F35A3D',
    orange: '#FE8421',
    yellow: '#FFDE00',
    grey: '#929292',
  };

  public format(servers: Servers):string {
    return this.tableResponse(servers);
  }

  public tableResponse(servers: Servers): string  {
    let headings: string[] = ['Server', 'Settings'];
    let serverTable: [string[]] = [headings];

    servers.Servers.forEach(server => serverTable.push(this.serverRow(server)));
    return table(serverTable, { border: getBorderCharacters('norc') })
  }

  private serverRow(server: Server): string[] {
    let row: any[] = [];

    let tokens: string = '';
    server.ApiTokens.forEach((token, index) => {
      tokens += token;
      if (server.ApiTokens.length > index + 1) tokens += '\n'
    });

    // Name column
    const name: string =
      chalk.white.bgHex(ServerTableFormat.ServerColors[server.Color])('  ') +
      ` ${chalk.bold.white(server.Name)}` +
      chalk.gray(`\nID: ${server.ID}`) +
      `\n${chalk.gray(server.ServerLink)}` +
      `\n\n${chalk.bold.white('Server API Tokens')}\n` + tokens;
    row.push(name);

    // Settings column
    const settings: string =
      `SMTP: ${this.stateLabel(server.SmtpApiActivated)}` +
      `\nOpen Tracking: ${this.stateLabel(server.TrackOpens)}` +
      `\nLink Tracking: ${this.linkTrackingStateLabel(server.TrackLinks)}` +
      `\nInbound: ${this.stateLabel(server.InboundHookUrl !== '')}`;
    row.push(settings);

    return row
  }

  private stateLabel(state: boolean | undefined): string {
    return state ? chalk.green('Enabled') : chalk.gray('Disabled')
  }

  private linkTrackingStateLabel(state: string): string  {
    switch (state) {
      case 'TextOnly':
        return chalk.green('Text')
      case 'HtmlOnly':
        return chalk.green('HTML')
      case 'HtmlAndText':
        return chalk.green('HTML and Text')
      default:
        return chalk.gray('Disabled')
    }
  }
}
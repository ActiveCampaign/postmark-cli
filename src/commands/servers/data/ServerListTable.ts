import {Server, Servers} from "postmark/dist/client/models";
import chalk from "chalk";
import {ColorMap} from "../../../types/index";
import {TableFormat} from "../../../handler/data/TableFormat";

export class ServerListTable extends TableFormat {
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

  public transform(servers: Servers):string {
    return this.stylizedTable(servers);
  }

  public stylizedTable(servers: Servers): string  {
    let headings: string[] = ['Server', 'Settings'];
    let serverTable: [string[]] = [[]];
    serverTable.pop();

    servers.Servers.forEach(server => serverTable.push(this.getServerRow(server)));
    return this.getTable(headings, serverTable, 'Servers list')
  }

  private getServerRow(server: Server): string[] {
    let row: string[] = [];
    row.push(this.getServerNameColumnDetails(server));
    row.push(this.getServerSettingsColumnDetails(server));
    return row
  }

  private getServerNameColumnDetails(server: Server): string {
    const tokens = server.ApiTokens.map((token) => {return token}).join("\n");

    return  `${chalk.white.bgHex(ServerListTable.ServerColors[server.Color])('  ')} ${chalk.white(server.Name)}` +
            `\n\n${chalk.gray(`ID: ${server.ID}`)}`     +
            `\n${chalk.gray(server.ServerLink)}`        +
            `\n\n${chalk.white('Server API Tokens')}\n${tokens}`;
  }

  private getServerSettingsColumnDetails(server: Server): string {
    return  `SMTP: ${this.adjustBooleanStateValue(server.SmtpApiActivated)}`            +
            `\nOpen Tracking: ${server.TrackOpens}`                                     +
            `\nLink Tracking: ${this.adjustLinkTrackingStateValue(server.TrackLinks)}`  +
            `\nInbound: ${this.adjustBooleanStateValue(server.InboundHookUrl !== '')}`;
  }

  private adjustBooleanStateValue(state: boolean | undefined): string {
    return state ?  chalk.green('Enabled') :
                    chalk.gray('Disabled')
  }

  private adjustLinkTrackingStateValue(state: string): string  {
    switch (state) {
      case 'TextOnly':
        return chalk.green('Text');
      case 'HtmlOnly':
        return chalk.green('HTML');
      case 'HtmlAndText':
        return chalk.green('HTML and Text');
      default:
        return chalk.gray('Disabled')
    }
  }
}
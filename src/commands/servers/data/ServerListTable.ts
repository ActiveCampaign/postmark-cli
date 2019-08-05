import {Server, Servers} from "postmark/dist/client/models";
import {TableFormat} from "../../../handler/data/TableFormat";
import {ColorMap} from "../../../types";
import {StringFormatter} from "../../../handler/data/StringFormatter";

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

  public getData(servers: Servers):string {
    return this.getFormattedTable(servers);
  }

  public getFormattedTable(servers: Servers): string  {
    let headings: string[] = ['Server', 'Settings'];
    let serverTable: [string[]] = [[]];
    serverTable.pop();

    servers.Servers.forEach(server => serverTable.push(this.tableRow(server)));
    return this.getTable(headings, serverTable, 'Servers list');
  }

  private tableRow(server: Server): string[] {
    let row: string[] = [];
    row.push(this.serverNameColumn(server));
    row.push(this.serverSettingsColumn(server));
    return row
  }

  /**
   * Retrieve formatted string of most important server settings as a column for a table.
   *
   * @param {Server} server - server details
   * @return {string} - formatted string to display in table name column
   */
  private serverNameColumn(server: Server): string {
    const formattedString: StringFormatter = new StringFormatter();

    formattedString.appendColoredHexValue('  ', ServerListTable.ServerColors[server.Color])
      .appendWhitespace()
      .appendValue(server.Name)
      .appendLine(2);

    formattedString.appendColoredValue('ID: ', 'gray')
      .appendColoredValue(server.ID.toString(), 'gray')
      .appendLine();

    formattedString.appendColoredValue(server.ServerLink, 'gray')
      .appendLine(2);

    formattedString.appendValue('Server API Tokens')
      .appendLine()
      .appendValue(server.ApiTokens.map((token) => {return token}).join("\n"));

    return formattedString.getValue();
  }

  /**
   * Retrieve formatted string of most important server settings as a column for a table.
   *
   * @param {Server} server - server details
   * @return {string} - formatted string to display in table setings column
   */
  private serverSettingsColumn(server: Server): string {
    const formattedString: StringFormatter = new StringFormatter();

    formattedString.appendValue("SMTP:")
      .appendColoredValue(formattedString.getReservedWordValue(server.SmtpApiActivated))
      .appendLine();

    formattedString.appendValue('Open Tracking:')
      .appendColoredValue(formattedString.getReservedWordValue(server.TrackOpens))
      .appendLine();

    formattedString.appendValue('Link Tracking:')
      .appendColoredValue(formattedString.getReservedWordValue(server.TrackLinks))
      .appendLine();

    formattedString.appendValue('Inbound:')
      .appendColoredValue(server.InboundHookUrl === '' ? 'Enabled' : 'Disabled' )
      .appendLine();

    return formattedString.getValue();
  }
}
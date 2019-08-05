import {Server, Servers} from "postmark/dist/client/models";
import {TableFormat, StringFormatter} from "../../../handler/data/index";
import {ServerColors} from "./ServerColors";

export class ServerListTable extends TableFormat {
  public getData(servers: Servers):string {
    return this.getFormattedTable(servers);
  }

  public getFormattedTable(servers: Servers): string  {
    const headings: string[] = ['Server', 'Settings'];
    return this.getTable(headings, servers.Servers.map( server => this.tableRow(server)), 'Servers list');
  }

  private tableRow(server: Server): string[] {
    return [this.serverNameColumn(server), this.serverSettingsColumn(server)]
  }

  /**
   * Retrieve formatted string of most important server settings as a column for a table.
   *
   * @param {Server} server - server details
   * @return {string} - formatted string to display in table name column
   */
  private serverNameColumn(server: Server): string {
    const formatter: StringFormatter = new StringFormatter();

    formatter.appendColoredHexValue('  ', ServerColors[server.Color])
      .appendWhitespace()
      .appendValue(server.Name)
      .appendLine(2);

    formatter.appendColoredValue('ID: ', 'gray')
      .appendColoredValue(server.ID.toString(), 'gray')
      .appendLine();

    formatter.appendColoredValue(server.ServerLink, 'gray')
      .appendLine(2);

    formatter.appendValue('Server API Tokens')
      .appendLine()
      .appendValue(server.ApiTokens.map((token) => {return token}).join("\n"));

    return formatter.toString();
  }

  /**
   * Retrieve formatted string of most important server settings as a column for a table.
   *
   * @param {Server} server - server details
   * @return {string} - formatted string to display in table setings column
   */
  private serverSettingsColumn(server: Server): string {
    const formatter: StringFormatter = new StringFormatter();

    formatter.appendValue("SMTP:")
      .appendColoredValue(formatter.getReservedWordValue(server.SmtpApiActivated))
      .appendLine();

    formatter.appendValue('Open Tracking:')
      .appendColoredValue(formatter.getReservedWordValue(server.TrackOpens))
      .appendLine();

    formatter.appendValue('Link Tracking:')
      .appendColoredValue(formatter.getReservedWordValue(server.TrackLinks))
      .appendLine();

    formatter.appendValue('Inbound:')
      .appendColoredValue(server.InboundHookUrl === '' ? 'Enabled' : 'Disabled' )
      .appendLine();

    return formatter.toString();
  }
}
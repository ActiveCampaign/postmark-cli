import chalk from 'chalk'
import { AccountClient } from 'postmark'
import { table, getBorderCharacters } from 'table'
import { validateToken, CommandResponse } from '../../utils'
import { ServerListArguments, ColorMap } from '../../types'
import { Servers, Server } from 'postmark/dist/client/models'

export const command = 'list [options]'
export const desc = 'List the servers on your account'
export const builder = {
  'account-token': {
    type: 'string',
    hidden: true,
  },
  'request-host': {
    type: 'string',
    hidden: true,
  },
  count: {
    type: 'number',
    describe: 'Number of servers to return',
    alias: ['c'],
  },
  offset: {
    type: 'number',
    describe: 'Number of servers to skip',
    alias: ['o'],
  },
  name: {
    type: 'string',
    describe: 'Filter servers by name',
    alias: ['n'],
  },
  json: {
    type: 'boolean',
    describe: 'Return server list as JSON',
    alias: ['j'],
  },
  'show-tokens': {
    type: 'boolean',
    describe: 'Show server tokens with server info',
    alias: ['t'],
  },
}
export const handler = (args: ServerListArguments): Promise<void> => exec(args)

/**
 * Execute the command
 */
const exec = (args: ServerListArguments): Promise<void> => {
  const { accountToken } = args

  return validateToken(accountToken, true).then(token => {
    listCommand(token, args)
  })
}

/**
 * Get list of servers
 */
const listCommand = (accountToken: string, args: ServerListArguments): void => {
  const { count, offset, name, showTokens, requestHost } = args
  const command: CommandResponse = new CommandResponse()
  command.initResponse('Fetching servers...')
  const client = new AccountClient(accountToken)
  if (requestHost !== undefined && requestHost !== '') {
    client.clientOptions.requestHost = requestHost
  }

  getServers(client, count, offset, name)
    .then(response => {
      if (args.json) {
        return command.response(serverJson(response, showTokens))
      }

      return command.response(serverTable(response, showTokens))
    })
    .catch(error => {
      return command.errorResponse(error)
    })
}

/**
 * Fetch servers from Postmark
 */
const getServers = (
  client: AccountClient,
  count: number,
  offset: number,
  name: string
): Promise<Servers> => {
  const options = {
    ...(count && { count: count }),
    ...(offset && { offset: offset }),
    ...(name && { name: name }),
  }
  return client.getServers(options)
}

/**
 * Return server as JSON
 */
const serverJson = (servers: Servers, showTokens: boolean): string => {
  if (showTokens) return JSON.stringify(servers, null, 2)

  servers.Servers.forEach(item => {
    item.ApiTokens.forEach(
      (token, index) => (item.ApiTokens[index] = tokenMask())
    )
    return item
  })

  return JSON.stringify(servers, null, 2)
}

/**
 * Create a table with server info
 */
const serverTable = (servers: Servers, showTokens: boolean): string => {
  let headings = ['Server', 'Settings']
  let serverTable: any[] = [headings]

  // Create server rows
  servers.Servers.forEach(server =>
    serverTable.push(serverRow(server, showTokens))
  )
  return table(serverTable, { border: getBorderCharacters('norc') })
}

/**
 * Create server row
 */
const serverRow = (server: Server, showTokens: boolean): string[] => {
  let row = []

  let tokens = ''
  server.ApiTokens.forEach((token, index) => {
    tokens += showTokens ? token : tokenMask()
    if (server.ApiTokens.length > index + 1) tokens += '\n'
  })

  // Name column
  const name =
    chalk.white.bgHex(colorMap[server.Color])('  ') +
    ` ${chalk.bold.white(server.Name)}` +
    chalk.gray(`\nID: ${server.ID}`) +
    `\n${chalk.gray(server.ServerLink)}` +
    `\n\n${chalk.bold.white('Server API Tokens')}\n` +
    tokens
  row.push(name)

  // Settings column
  const settings =
    `SMTP: ${stateLabel(server.SmtpApiActivated)}` +
    `\nOpen Tracking: ${stateLabel(server.TrackOpens)}` +
    `\nLink Tracking: ${linkTrackingStateLabel(server.TrackLinks)}` +
    `\nInbound: ${stateLabel(server.InboundHookUrl !== '')}`
  row.push(settings)

  return row
}

const tokenMask = (): string => '•'.repeat(36)

export const stateLabel = (state: boolean | undefined): string => {
  return state ? chalk.green('Enabled') : chalk.gray('Disabled')
}

export const linkTrackingStateLabel = (state: string): string => {
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

const colorMap: ColorMap = {
  purple: '#9C73D2',
  blue: '#21CDFE',
  turquoise: '#52F3ED',
  green: '#3BE380',
  red: '#F35A3D',
  orange: '#FE8421',
  yellow: '#FFDE00',
  grey: '#929292',
}

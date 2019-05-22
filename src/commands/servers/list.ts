import { AccountClient } from 'postmark'
import { validateToken, CommandResponse } from '../../utils'
import { ServerListArguments } from '../../types'

export const command = 'list [options]'
export const desc = 'List the servers on your account'
export const builder = {
  'account-token': {
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
}
export const handler = (args: ServerListArguments) => exec(args)

/**
 * Execute the command
 */
const exec = (args: ServerListArguments) => {
  const { accountToken } = args

  return validateToken(accountToken, true).then(token => {
    fetch(token, args)
  })
}

/**
 * Fetch the servers
 */
const fetch = (accountToken: string, args: ServerListArguments) => {
  const command: CommandResponse = new CommandResponse()
  command.initResponse('Fetching servers...')
  const client = new AccountClient(accountToken)
  const options = {
    ...(args.count && { count: args.count }),
    ...(args.offset && { offset: args.offset }),
    ...(args.name && { name: args.name }),
  }

  client
    .getServers(options)
    .then(response => {
      command.response(JSON.stringify(response, null, 2))
    })
    .catch(error => {
      command.errorResponse(error)
    })
}

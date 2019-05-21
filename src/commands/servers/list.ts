import ora from 'ora'
import { AccountClient } from 'postmark'
import { log, validateToken } from '../../utils'

interface Types {
  accountToken: string
  count: number
  offset: number
  name: string
}

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
export const handler = (args: Types) => exec(args)

/**
 * Execute the command
 */
const exec = (args: Types) => {
  const { accountToken } = args

  return validateToken(accountToken, true).then(token => {
    fetch(token, args)
  })
}

/**
 * Fetch the servers
 */
const fetch = (accountToken: string, args: Types) => {
  const spinner = ora('Fetching servers...').start()
  const client = new AccountClient(accountToken)
  const options = {
    ...(args.count && { count: args.count }),
    ...(args.offset && { offset: args.offset }),
    ...(args.name && { name: args.name }),
  }

  client
    .getServers(options)
    .then(response => {
      spinner.stop()
      log(JSON.stringify(response, null, 2))
    })
    .catch(error => {
      spinner.stop()
      log(JSON.stringify(error), { error: true })
      log(error, { error: true })
    })
}

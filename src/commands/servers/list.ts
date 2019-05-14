import chalk from 'chalk'
import * as ora from 'ora'
import { prompt } from 'inquirer'
import { AccountClient } from 'postmark'
import { log } from '../../utils'

interface types {
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
export const handler = (argv: types) => {
  if (!argv.accountToken) {
    prompt([
      {
        type: 'password',
        name: 'accountToken',
        message: 'Please enter your account token',
        mask: '•',
      },
    ]).then((answer: any) => {
      if (answer.accountToken) {
        execute(answer.accountToken, argv)
      } else {
        log('Invalid account token', { error: true })
      }
    })
  } else {
    execute(argv.accountToken, argv)
  }
}

/**
 * Execute the command
 */
const execute = (accountToken: string, args: types) => {
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

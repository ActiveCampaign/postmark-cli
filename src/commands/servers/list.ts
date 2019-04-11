import chalk from 'chalk'
import * as ora from 'ora'
import { prompt } from 'inquirer'
import { AccountClient } from 'postmark'

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
export const handler = (argv: any) => {
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
        console.error(chalk.red('Invalid account token.'))
      }
    })
  } else {
    execute(argv.accountToken, argv)
  }
}

/**
 * Execute the command
 * @param  accoutToken
 * @param  args - Arguments from command
 */
const execute = (accountToken: string, args: any) => {
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
      console.log(JSON.stringify(response, null, 2))
    })
    .catch(error => {
      spinner.stop()
      console.log(chalk.red(JSON.stringify(error)))
    })
}

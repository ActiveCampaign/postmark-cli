import chalk from 'chalk'
import * as ora from 'ora'
import { prompt } from 'inquirer'
import { ServerClient } from 'postmark'

export const command = 'template [options]'
export const desc = 'Send a templated email'
export const builder = {
  'source-server': {
    type: 'string',
    hidden: true,
  },
  id: {
    type: 'string',
    describe: 'Template ID',
    alias: ['i'],
  },
  alias: {
    type: 'string',
    describe: 'Template Alias',
    alias: ['a'],
  },
  from: {
    type: 'string',
    describe:
      'Email address you are sending from. Must be an address on a verified domain or confirmed Sender Signature.',
    alias: ['f'],
    required: true,
  },
  to: {
    type: 'string',
    describe: 'Email address you are sending to',
    alias: ['t'],
    required: true,
  },
  model: {
    type: 'string',
    describe: '',
    alias: ['m'],
  },
}
export const handler = (argv: any) => {
  if (!argv.serverToken) {
    prompt([
      {
        type: 'password',
        name: 'serverToken',
        message: 'Please enter your server token',
        mask: '•',
      },
    ]).then((answer: any) => {
      if (answer.serverToken) {
        execute(answer.serverToken, argv)
      } else {
        console.error(chalk.red('Invalid server token.'))
      }
    })
  } else {
    execute(argv.serverToken, argv)
  }
}

/**
 * Execute the command
 * @param  serverToken
 * @param  args
 */
const execute = (serverToken: string, args: any) => {
  const spinner = ora('Sending an email').start()
  const client = new ServerClient(serverToken)
  client
    .sendEmailWithTemplate({
      TemplateId: args.id ? args.id : undefined,
      TemplateAlias: args.alias ? args.alias : undefined,
      From: args.from,
      To: args.to,
      TemplateModel: args.model ? JSON.parse(args.model) : undefined,
    })
    .then(response => {
      spinner.stop()
      console.log(chalk.green(JSON.stringify(response)))
    })
    .catch(error => {
      spinner.stop()
      console.error(chalk.red(JSON.stringify(error)))
    })
}

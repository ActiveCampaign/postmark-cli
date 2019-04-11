import chalk from 'chalk'
import * as ora from 'ora'
import { prompt } from 'inquirer'
import { ServerClient } from 'postmark'

export const command = 'raw [options]'
export const desc = 'Send a raw email'
export const builder = {
  'server-token': {
    type: 'string',
    hidden: true,
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
  subject: {
    type: 'string',
    describe: 'The subject line of the email',
    required: true,
  },
  htmlbody: {
    type: 'string',
    describe: 'The HTML version of the email',
  },
  textbody: {
    type: 'string',
    describe: 'The text version of the email',
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
    .sendEmail({
      From: args.from,
      To: args.to,
      Subject: args.subject,
      HtmlBody: args.htmlbody ? args.htmlbody : undefined,
      TextBody: args.textbody ? args.textbody : undefined,
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
